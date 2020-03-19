import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.springframework.beans.factory.getBean
import org.springframework.context.support.GenericApplicationContext
import org.springframework.context.support.beans
import org.springframework.core.Ordered
import org.springframework.core.io.ClassPathResource
import org.springframework.http.MediaType.APPLICATION_JSON
import org.springframework.http.server.reactive.ReactorHttpHandlerAdapter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.CorsWebFilter
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource
import org.springframework.web.reactive.function.server.*
import org.springframework.web.reactive.function.server.ServerResponse.ok
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping
import org.springframework.web.reactive.socket.WebSocketHandler
import org.springframework.web.reactive.socket.WebSocketSession
import org.springframework.web.reactive.socket.server.WebSocketService
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebHandler
import org.springframework.web.server.adapter.WebHttpHandlerBuilder
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import reactor.netty.http.server.HttpServer
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter.ISO_DATE_TIME

// Model.kt
data class Message(val createdAt: String, val message: String, val user: String/*, val test: ZonedDateTime = ZonedDateTime.now()*/)
data class AddMessage(val message: String, val user: String)

// web/MessageHandler.kt
fun AddMessage.toMessage() = Message(
  createdAt = ZonedDateTime.now().format(ISO_DATE_TIME),
  message = message,
  user = user
)

class MessageHandler {
  private val now = ZonedDateTime.now()
  private var users = Flux.just(
    Message(now.minusMinutes(10).format(ISO_DATE_TIME), "hello", "anonymous"),
    Message(now.minusMinutes(5).format(ISO_DATE_TIME), "world", "anonymous"),
    Message(now.format(ISO_DATE_TIME), "everyone", "anonymous")
  )

  fun findAll() = ok().body(users)

  fun addMessage(req: ServerRequest): Mono<ServerResponse> {
    val message: Mono<Message> = req.bodyToMono(AddMessage::class.java).map { it.toMessage() }
    println("hier")
    users = users.concatWith(message)
    return ok().body(message)
  }
}

class SocketHandler: WebSocketHandler {
  override fun handle(session: WebSocketSession): Mono<Void> {
    return session
      .send( session.receive()
        .map { msg -> "RECEIVED ON SERVER :: " + msg.getPayloadAsText() }
        .map(session::textMessage)
    )
  }
}

fun routes(messageHandler: MessageHandler) = router {
  GET("/api/messages") { messageHandler.findAll() }
  POST("/api/message", accept(APPLICATION_JSON), messageHandler::addMessage)
  resources("/**", ClassPathResource("static/"))
}

fun corsConfig(): UrlBasedCorsConfigurationSource {
  val config = CorsConfiguration()

// Possibly...
// config.applyPermitDefaultValues()

  config.allowCredentials = true
  config.addAllowedOrigin("*")
  config.addAllowedHeader("*")
  config.addAllowedMethod("*")

  val source = UrlBasedCorsConfigurationSource()
  source.registerCorsConfiguration("/**", config)

  return source
}

fun beans() = beans {
  bean<MessageHandler>()
  bean { CorsWebFilter(corsConfig()) }
  bean<WebSocketHandler> { SocketHandler() }
  bean { SimpleUrlHandlerMapping().apply {
    urlMap = mapOf("/echo" to ref<SocketHandler>() )
    order = Ordered.HIGHEST_PRECEDENCE
  } }
  bean<WebSocketService> { HandshakeWebSocketService(ReactorNettyRequestUpgradeStrategy()) }
  bean("webHandler") { RouterFunctions.toWebHandler(routes(ref())) }
}

// Application.kt
fun main() {
  ObjectMapper().registerKotlinModule()

  val context = GenericApplicationContext().apply {
    beans().initialize(this)
    refresh()
  }

  val webSocketService = context.getBean<WebSocketService>()
  val webHandler = context.getBean<WebHandler>()

  fun handle(exchange: ServerWebExchange): Mono<Void> {
    val elements = exchange.request.path.pathWithinApplication().elements()

    return if (elements.size == 2 && elements[1].value() == "socket")
      webSocketService.handleRequest(exchange, context.getBean() )
    else
      webHandler.handle(exchange)
  }

  val httpHandler = WebHttpHandlerBuilder
    .webHandler(::handle)
    .filter(context.getBean<CorsWebFilter>())
    .build()

  HttpServer
    .create()
    .port(8080)
    .handle(ReactorHttpHandlerAdapter(httpHandler))
    .bindNow()
    .onDispose()
    .block()
}
