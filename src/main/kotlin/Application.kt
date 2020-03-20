import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.reactivestreams.Publisher
import org.reactivestreams.Subscriber
import org.reactivestreams.Subscription
import org.springframework.context.support.GenericApplicationContext
import org.springframework.context.support.beans
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType.APPLICATION_JSON
import org.springframework.http.MediaType.TEXT_HTML
import org.springframework.http.server.reactive.ReactorHttpHandlerAdapter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.CorsWebFilter
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource
import org.springframework.web.reactive.function.server.*
import org.springframework.web.reactive.function.server.ServerResponse.ok
import org.springframework.web.reactive.socket.WebSocketHandler
import org.springframework.web.reactive.socket.WebSocketSession
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebHandler
import org.springframework.web.server.adapter.WebHttpHandlerBuilder
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import reactor.netty.http.server.HttpServer
import java.lang.Integer.parseInt
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter.ISO_DATE_TIME

data class Message(val createdAt: String, val message: String, val user: String)
data class AddMessage(val message: String, val user: String)

// MessageHandler.kt
class MessageHandler(private val handler: SocketHandler) {
  private val lock = Object()
  private val now = ZonedDateTime.now()
  private var users = Flux.just(
    Message(now.minusMinutes(10).format(ISO_DATE_TIME), "hello", "anonymous"),
    Message(now.minusMinutes(5).format(ISO_DATE_TIME), "world", "anonymous"),
    Message(now.format(ISO_DATE_TIME), "everyone", "anonymous")
  )

  fun findAll() = ok().body(users)

  fun addMessage(req: ServerRequest): Mono<ServerResponse> {
    val message: Mono<Message> = req.bodyToMono(AddMessage::class.java)
      .map { it.toMessage() }

    return message.flatMap { m ->
      synchronized(lock) { users = users.concatWith(Mono.just(m)) }
      handler.sendMessage(m)

      ok().build()
    }
  }

  private fun AddMessage.toMessage() = Message(
    createdAt = ZonedDateTime.now().format(ISO_DATE_TIME),
    message = message,
    user = user
  )
}

// SocketHandler.kt
class SocketHandler: WebSocketHandler, Publisher<Message> {
  private val lock = Object()
  private var subscriptions = listOf<MySubscription>()

  override fun subscribe(subscriber: Subscriber<in Message>?) {
    if (subscriber != null) {
      val subscription = MySubscription(subscriber) { sub ->
        synchronized(lock) { subscriptions = subscriptions - sub }
      }
      synchronized(lock) {
        subscriptions = subscriptions + subscription
        subscriber.onSubscribe(subscription)
      }
    }
  }

  fun sendMessage(message: Message) = subscriptions.forEach { s -> s.prepareMessage(message) }

  override fun handle(session: WebSocketSession): Mono<Void> = session.send(
    Flux.from(this)
      .map { message ->
        """{"createdAt": "${message.createdAt}", "message": "${message.message}", "user": "${message.user}"}"""
      }
      .map(session::textMessage)
  )

  class MySubscription(
    val subscriber: Subscriber<in Message>,
    val unsubscribe: (MySubscription) -> Unit
  ): Subscription {
    private val lock = Object()
    private var isCanceled = false
    private var messages: List<Message> = listOf()
    private var requested: Int = 0

    override fun cancel() = synchronized(lock) {
      isCanceled = true
      unsubscribe(this)
    }

    override fun request(n: Long) = synchronized(lock) {
      if (!isCanceled) {
        requested += n.toInt()
        send()
      }
    }

    fun prepareMessage(message: Message) = synchronized(lock) {
      if (!isCanceled) {
        messages = messages + message
        send()
      }
    }

    private fun send() {
      val toSend = messages.take(requested)
      toSend.forEach(subscriber::onNext)

      messages = messages.drop(toSend.size)
      requested -= toSend.size
    }
  }
}

// Handler.kt
class Handler(
  messageHandler: MessageHandler,
  private val webSocketHandler: WebSocketHandler,
  private val index: Resource
): WebHandler {
  private val webSocketService = HandshakeWebSocketService(ReactorNettyRequestUpgradeStrategy())
  private val webHandler = RouterFunctions.toWebHandler(router(messageHandler))

  override fun handle(exchange: ServerWebExchange): Mono<Void> {
    val elements = exchange.request.path.pathWithinApplication().elements()

    return if (elements.size == 2 && elements[1].value() == "socket")
      webSocketService.handleRequest(exchange, webSocketHandler )
    else
      webHandler.handle(exchange)
  }

  private fun router(messageHandler: MessageHandler) = router {
    GET("/") { ok().contentType(TEXT_HTML).bodyValue(index)}
    GET("/api/messages") { messageHandler.findAll() }
    POST("/api/message", accept(APPLICATION_JSON), messageHandler::addMessage)
    resources("/**", ClassPathResource("public/"))
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
  bean<MessageHandler>()
  bean<SocketHandler>()
  bean("webHandler") { Handler(ref(), ref(), index) }
}

fun main() {
  ObjectMapper().registerKotlinModule()

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
