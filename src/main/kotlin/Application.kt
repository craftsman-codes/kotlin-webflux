import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.springframework.context.support.GenericApplicationContext
import org.springframework.context.support.beans
import org.springframework.core.io.ClassPathResource
import org.springframework.http.MediaType.APPLICATION_JSON
import org.springframework.http.server.reactive.ReactorHttpHandlerAdapter
import org.springframework.web.cors.reactive.CorsWebFilter
import org.springframework.web.reactive.function.server.*
import org.springframework.web.reactive.function.server.ServerResponse.ok
import org.springframework.web.server.adapter.WebHttpHandlerBuilder
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import reactor.netty.http.server.HttpServer
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter.ISO_DATE_TIME
import org.springframework.beans.factory.getBean
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource

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
//  init {
//  }

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

// Application.kt
fun main() {
  val config = CorsConfiguration()

// Possibly...
// config.applyPermitDefaultValues()

  config.allowCredentials = true
  config.addAllowedOrigin("*")
  config.addAllowedHeader("*")
  config.addAllowedMethod("*")

  val source = UrlBasedCorsConfigurationSource()
  source.registerCorsConfiguration("/**", config)

  ObjectMapper()
//    .registerModule(JavaTimeModule())
//    .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    .registerKotlinModule()

  fun routes(messageHandler: MessageHandler) = router {
    GET("/api/messages") { messageHandler.findAll() }
    POST("/api/message", accept(APPLICATION_JSON), messageHandler::addMessage)
    resources("/**", ClassPathResource("static/"))
  }

  val context = GenericApplicationContext().apply {
    beans {
      bean<MessageHandler>()
      bean { CorsWebFilter(source) }
      bean("webHandler") { RouterFunctions.toWebHandler(routes(ref())) }
    }.initialize(this)

    refresh()
  }
  val httpHandler = WebHttpHandlerBuilder
    .applicationContext(context)
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
