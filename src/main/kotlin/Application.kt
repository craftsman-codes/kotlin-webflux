import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.reactivestreams.Publisher
import org.reactivestreams.Subscriber
import org.springframework.context.support.GenericApplicationContext
import org.springframework.context.support.beans
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType.TEXT_HTML
import org.springframework.http.server.reactive.ReactorHttpHandlerAdapter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.CorsWebFilter
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource
import org.springframework.web.reactive.function.server.RouterFunctions
import org.springframework.web.reactive.function.server.router
import org.springframework.web.reactive.socket.WebSocketHandler
import org.springframework.web.reactive.socket.WebSocketMessage
import org.springframework.web.reactive.socket.WebSocketSession
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebHandler
import org.springframework.web.server.adapter.WebHttpHandlerBuilder
import reactor.core.publisher.Flux
import reactor.core.publisher.FluxSink
import reactor.core.publisher.Mono
import reactor.netty.http.server.HttpServer
import java.lang.Integer.parseInt
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter.ISO_DATE_TIME

sealed class Event(val type: String)
data class Message(val createdAt: String, val message: String, val user: String): Event("Message")
data class SessionVideoFrame(val sessionId: String, val frame: String, val user: String): Event("SessionVideoFrame")
data class JoiningUser(val joining: String): Event("JoiningUser")
data class LeavingUser(val leaving: String): Event("LeavingUser")

sealed class Command
data class AddMessage(val message: String, val user: String): Command()
data class VideoFrame(val frame: String, val user: String): Command()
object LoadMessages: Command()

fun AddMessage.toMessage() = Message(
  createdAt = ZonedDateTime.now().format(ISO_DATE_TIME),
  message = message,
  user = user
)

class EventBus: Publisher<Event> {
  private val lock = Object()
  private var sinks = emptyList<FluxSink<Event>>()
  init {
    println("constructed: ${this::class.java}")
  }

  fun next(event: Event) = sinks.forEach {
    println("doing next")
    try { it.next(event) } catch (e: Exception) {}
  }

  override fun subscribe(subscriber: Subscriber<in Event>?) {
    val wrapped = Flux.create<Event> { sink ->
      sink.onDispose { synchronized(lock) { sinks = sinks - sink } }
      synchronized(lock) { sinks = sinks + sink }
    }
    subscriber?.also { wrapped.subscribe(it) }
  }
}

class SessionRepository {
  private val lock = Object()
  private var sessions = emptyList<String>()

  fun registerSession(id: String) = synchronized(lock) {
    sessions = sessions + id
  }
  fun unregisterSession(id: String) = synchronized(lock) {
    sessions = sessions - id
  }

  fun users() = sessions
}

class SocketHandler(
  private val objectMapper: ObjectMapper,
  private val messageRepository: MessageRepository,
  private val sessionRepository: SessionRepository,
  private val eventBus: EventBus
): WebSocketHandler {
  override fun handle(session: WebSocketSession): Mono<Void> {
    val sessionId = session.id
    sessionRepository.registerSession(sessionId)
    eventBus.next(JoiningUser(sessionId))
    val eventPipe = Flux.merge(
      session.receive().flatMap { Flux.fromIterable(handleMessage(session, readCommand(it))) },
      Flux.from(eventBus)
    )
      .map { event -> session.textMessage(objectMapper.writeValueAsString(event))}
    return session.send(eventPipe).doOnTerminate {
      println("$sessionId is leaving")
      sessionRepository.unregisterSession(sessionId)
      eventBus.next(LeavingUser(sessionId))
    }
  }

  private fun handleMessage(session: WebSocketSession, incomingMessage: Command): List<Event> {
    return when (incomingMessage) {
      is AddMessage -> {
        val message = incomingMessage.toMessage()
        messageRepository.addMessage(message)
        eventBus.next(message)
        emptyList()
      }
      is LoadMessages ->
        messageRepository.getMessages() + sessionRepository.users().map { JoiningUser(it) }
      is VideoFrame -> {
        eventBus.next(SessionVideoFrame(session.id, incomingMessage.frame, incomingMessage.user))
        emptyList()
      }
    }
  }

  private inline fun <reified T>deserialize(json: JsonNode): T = objectMapper.treeToValue(json, T::class.java)

  private fun readCommand(webSocketMessage: WebSocketMessage): Command {
    val json = objectMapper.readTree(webSocketMessage.payloadAsText)
    val messageType = json.get("messageType")?.asText()

    return when (messageType) {
      "VideoFrame" -> deserialize<VideoFrame>(json)
      "AddMessage" -> deserialize<AddMessage>(json)
      "LoadMessages" -> LoadMessages
      else -> {
        val error = "Unsupported WebSocketMessage: ${messageType ?: "No messageType provided"}"
        println(error)
        throw Exception(error)
      }
    }
  }
}

// MessageHandler.kt
class MessageRepository {
  private val lock = Object()
  private var messages = emptyList<Message>()

  fun getMessages(): List<Message> = messages
  fun addMessage(message: Message) = synchronized(lock) { messages = messages.take(100) + message }
}

// Handler.kt
class Handler(
  private val webSocketHandler: WebSocketHandler,
  private val index: Resource
): WebHandler {
  private val webSocketService = HandshakeWebSocketService(ReactorNettyRequestUpgradeStrategy().apply {
    maxFramePayloadLength = 1 * 1024 * 1024
  })
  private val webHandler = RouterFunctions.toWebHandler(router {
    GET("/") { ok().contentType(TEXT_HTML).bodyValue(index)}
    resources("/**", ClassPathResource("public/"))
  })

  override fun handle(exchange: ServerWebExchange): Mono<Void> {
    val elements = exchange.request.path.pathWithinApplication().elements()

    return if (elements.size == 2 && elements[1].value() == "socket")
      webSocketService.handleRequest(exchange, webSocketHandler )
    else
      webHandler.handle(exchange)
  }

}

// Application.kt
fun corsConfig() = UrlBasedCorsConfigurationSource().apply {
  registerCorsConfiguration(
    "/**",
    CorsConfiguration().apply {
      allowCredentials = true
      addAllowedOrigin("*")
      addAllowedHeader("*")
      addAllowedMethod("*")
    }
  )
}

fun beans(index: Resource) = beans {
  bean { ObjectMapper()
    .registerKotlinModule()
    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
  }
  bean<MessageRepository>()
  bean<SessionRepository>()
  bean<EventBus>()
  bean<SocketHandler>()
  bean("webHandler") { Handler(ref(), index) }
}

fun main() {
  val context = GenericApplicationContext().apply {
    beans(getResource("/public/index.html"))
      .initialize(this)
    refresh()
  }

  val httpHandler = WebHttpHandlerBuilder
    .applicationContext(context)
    .filter(CorsWebFilter(corsConfig()))
    .build()

  val port = System.getenv("PORT")
  HttpServer
    .create()
    .port(if (port != null) parseInt(port) else 8080)
    .handle(ReactorHttpHandlerAdapter(httpHandler))
    .bindNow()
    .onDispose()
    .block()
}
