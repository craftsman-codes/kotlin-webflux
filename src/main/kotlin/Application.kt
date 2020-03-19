import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.reactivestreams.Publisher
import org.reactivestreams.Subscriber
import org.reactivestreams.Subscription
import org.springframework.beans.factory.getBean
import org.springframework.context.support.GenericApplicationContext
import org.springframework.context.support.beans
import org.springframework.core.io.ClassPathResource
import org.springframework.http.MediaType.APPLICATION_JSON
import org.springframework.http.server.reactive.ReactorHttpHandlerAdapter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.CorsWebFilter
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource
import org.springframework.web.reactive.function.server.*
import org.springframework.web.reactive.function.server.ServerResponse.ok
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
import java.lang.Integer.parseInt
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter.ISO_DATE_TIME
import java.util.concurrent.atomic.AtomicBoolean

// Model.kt
data class Message(val createdAt: String, val message: String, val user: String)
data class AddMessage(val message: String, val user: String)

// web/MessageHandler.kt
fun AddMessage.toMessage() = Message(
  createdAt = ZonedDateTime.now().format(ISO_DATE_TIME),
  message = message,
  user = user
)

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
    println("try add")
    val message: Mono<Message> = req.bodyToMono(AddMessage::class.java)
      .map { add ->
        println("add: $add")
        add.toMessage()
      }

    return message.flatMap { m ->
      println("add parsed: $m")
      println("handler: $handler")

      handler.sendMessage(m)
      synchronized(lock) { users = users.concatWith(Mono.just(m)) }

      ok().contentType(APPLICATION_JSON).body(Mono.just(m))
    }
  }
}

class MySubscription(val subscriber: Subscriber<in Message>, val unsubscribe: (MySubscription) -> Unit): Subscription {
  private val lock = Object()
  private val isCanceled = AtomicBoolean(false)
  private var messages: List<Message> = listOf()
  private var requested: Int = 0

  override fun cancel() {
    println("someone cancelled")
    isCanceled.set(true)
    unsubscribe(this)
  }

  private fun send() {
    val toSend = messages.take(requested)
    toSend.forEach { message ->
      println("sending message $message")
      subscriber.onNext(message)
    }

    messages = messages.drop(toSend.size)
    requested -= toSend.size
  }

  override fun request(n: Long) = synchronized(lock) {
    println("request is made for: $n")
    if (!isCanceled.get()) {
      requested += n.toInt()
      send()
    }
  }

  fun prepareMessage(message: Message) = synchronized(lock) {
    if (!isCanceled.get()) {
      println("caching message $message")
      messages = messages + message
      send()
    }
  }
}

class SocketHandler: WebSocketHandler, Publisher<Message> {
  private val lock = Object()
  private var subscriptions = listOf<MySubscription>()

  override fun subscribe(subscriber: Subscriber<in Message>?) {
    if (subscriber != null) {
      synchronized(lock) {
        val subscription = MySubscription(subscriber) { sub ->
          synchronized(lock) { subscriptions = subscriptions - sub }
        }

        println("subscribing: $subscriber")
        subscriptions = subscriptions + subscription
        subscriber.onSubscribe(subscription)
      }
    }
  }

  fun sendMessage(message: Message) {
    println("pushing message: $message")
    println("subscribers before message: $subscriptions")
    subscriptions.forEach { s ->
      println("sub: $s")
      s.prepareMessage(message)
    }
  }

  override fun handle(session: WebSocketSession): Mono<Void> {
    return session
      .send(
        Flux.from(this)
          .map { message ->
            println("trying to send websocketmessage")
            """{"createdAt": "${message.createdAt}", "message": "${message.message}", "user": "${message.user}"}"""
          }
          .map(session::textMessage)
      )
  }
}

// Application.kt
fun corsConfig(): UrlBasedCorsConfigurationSource {
  val config = CorsConfiguration()

  config.allowCredentials = true
  config.addAllowedOrigin("*")
  config.addAllowedHeader("*")
  config.addAllowedMethod("*")

  val source = UrlBasedCorsConfigurationSource()
  source.registerCorsConfiguration("/**", config)

  return source
}

fun routes(messageHandler: MessageHandler) = router {
  GET("/api/messages") { messageHandler.findAll() }
  POST("/api/message", accept(APPLICATION_JSON), messageHandler::addMessage)
  resources("/**", ClassPathResource("public/"))
}

fun beans() = beans {
  bean<MessageHandler>()
  bean { CorsWebFilter(corsConfig()) }
  bean { SocketHandler() }
  bean { HandshakeWebSocketService(ReactorNettyRequestUpgradeStrategy()) }
  bean("webHandler") { RouterFunctions.toWebHandler(routes(ref())) }
}

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

  val port = System.getenv("PORT")
  HttpServer
    .create()
    .port(if (port != null) parseInt(port) else 8080)
    .handle(ReactorHttpHandlerAdapter(httpHandler))
    .bindNow()
    .onDispose()
    .block()
}
