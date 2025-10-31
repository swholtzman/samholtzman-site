const http = require("http")
const lang = require("./locals/en/lang")
const { Dictionary } = require("./modules/dictionary")
/**
 * Represents an HTTP server.
 */
class Server {
  /**
   * Initialize a new Server.
   * @param {string} address the network interfaces to listen at.
   * @param {number} port the port to listen at.
   */
  constructor(address, port) {
    this.address = address
    this.port = port
    this.dictionary = new Dictionary()
    this.requestsServed = 0
  }

  /**
   * Start listening for connections at the server's address and port.
   */
  listen() {
    http.createServer((req, res) => {

        const reqUrl = new URL(req.url, `http://${req.headers.host}`)

        this.requestsServed++

        res.setHeader("access-control-allow-origin", "*")

        if (reqUrl.pathname === "/api/definitions/") {

            if (req.method !== "GET") {
                res.statusCode = 405
                res.end()
                return
            }

            let word = reqUrl.searchParams.get("word")

            if (word === null) {
                res.statusCode = 400
                res.end(lang.QUERY_PARAM_MISSING.replaceAll("%1", "word"))
                return
            }

            if (!Dictionary.stringIsValid(word)) {
                res.statusCode = 400
                res.end(lang.STRING_INVALID_MESSAGE)
                return
            }

            const ret = {}
            const definition = this.dictionary.read(word)

            if (definition === null) {
                res.statusCode = 404
                res.end(lang.DEFINITION_NOT_FOUND.replaceAll("%1", word))
                return
            }

            ret["definition"] = definition
            ret["word_count"] = this.dictionary.size()

            res.setHeader("Content-Type", "application/json")
            res.statusCode = 200
            res.end(JSON.stringify(ret))
            return


        } else if (reqUrl.pathname === "/api/definitions") {

            if (req.method === "OPTIONS") {
                res.setHeader("access-control-allow-methods", "POST")
                res.setHeader("access-control-allow-headers", "*")
                res.end()
                return
            } else if (req.method === "POST") {
                let body = ""

                req.on("data", chunk => {
                    body += chunk.toString()
                })

                req.on("end", () => {
                    let parsedBody = {}

                    try {
                        parsedBody = JSON.parse(body)
                    } catch (err) {
                        res.statusCode = 400
                        res.end(lang.POST_BAD_REQUEST_JSON)
                        return
                    }

                    const word = parsedBody["word"]
                    const definition = parsedBody["definition"]

                    if (!Dictionary.stringIsValid(word) || !Dictionary.stringIsValid(definition)) {
                        res.statusCode = 400
                        res.end(lang.POST_BAD_REQUEST_FIELDS.replaceAll("%1", "word, definition"))
                        return
                    }

                    if (this.dictionary.read(word) !== null) {
                        res.statusCode = 409
                        res.end(lang.DEFINITION_EXISTS.replaceAll("%1", word))
                        return
                    }

                    this.dictionary.write(word, definition)
                    
                    res.statusCode = 201
                    res.end(lang.NEW_ENTRY.replaceAll("%1", word).replaceAll("%2", definition).replaceAll("%3", this.dictionary.size()).replaceAll("%4", this.requestsServed))
                    return
                })
            } else {
                res.statusCode = 405
                res.end()
                return
            }

        } else {
            res.statusCode = 404
            res.end()
            return
        }

    }).listen(this.port, this.address)

    console.log(`Listening on http://${this.address}:${this.port}`)
  }
}

const server = new Server("0.0.0.0", 8004)
server.listen()