const http = require("http")
const mariadb = require("mariadb")
const fs = require("fs")
const lang = require("./locals/en/lang")

class Server {
    constructor(address, port) {
        this.address = address
        this.port = port

    }

    /**
     * Start listening on the server's address and port.
     */
    async listen() {
        await this.#initializeDatabase()
        const pool = await this.#startConnection()

        http.createServer(async (req, res) => {
            const reqUrl = new URL(req.url, `https://${req.headers.host}`)

            res.setHeader("access-control-allow-origin", "*")

            let sql = null
            if (reqUrl.pathname === "/api/v1/sql/") {
                if (req.method !== "OPTIONS" && req.method !== "POST") {
                    res.statusCode = 405
                    res.end()
                    return
                }

                if (req.method === "OPTIONS") {
                    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS")
                    res.setHeader("access-control-allow-headers", "*")
                    res.end()
                    return
                }

                let body = ""
                req.on("data", chunk => { body += chunk.toString() })
                try {
                    await new Promise((acc, rej) => {
                        req.on("end", () => {
                            let parsedBody
                            try {
                                parsedBody = JSON.parse(body)
                            } catch (err) {
                                res.statusCode = 400
                                res.end(lang.POST_BAD_REQUEST_JSON.replaceAll("%1", err.toString()))
                                rej()
                                return
                            }

                            sql = parsedBody["query"]
                            acc()
                        })
                    })
                } catch {
                    return
                }

                if (sql === null || sql === undefined) {
                    res.statusCode = 400
                    res.end(lang.MISSING_BODY_PARAM.replaceAll("%1", "query"))
                    return
                }

            } else if (reqUrl.pathname.startsWith("/api/v1/sql/")) {
                if (req.method !== "GET") {
                    res.statusCode = 405
                    res.end()
                    return
                }
                try {
                    sql = decodeURIComponent(reqUrl.pathname.split("/api/v1/sql/")[1])
                } catch (err) {
                    res.statusCode = 400
                    res.end(lang.MALFORMED_URL.replaceAll("%1", err.toString()))
                    return
                }
                if (sql === null || sql === undefined) {
                    res.statusCode = 400
                    res.end(lang.MISSING_SEARCH_PARAM)
                    return
                }

            } else {
                res.statusCode = 404
                res.end()
                return
            }

            if (req.method === "POST" && sql.toLowerCase().trim().startsWith("select ")) {
                res.statusCode = 400
                res.end(lang.WRONG_SQL_QUERY.replaceAll("%1", "SELECT").replaceAll("%2", "POST"))
                return
            }

            if (req.method === "GET" && sql.toLowerCase().trim().startsWith("insert ")) {
                res.statusCode = 400
                res.end(lang.WRONG_SQL_QUERY.replaceAll("%1", "INSERT").replaceAll("%2", "GET"))
                return
            }

            let returnString = ""
            try {
                returnString = await this.#makeQuery(sql, pool)
            } catch (err) {
                if (err instanceof mariadb.SqlError) {
                    returnString = err.toString()
                    res.setHeader("content-type", "text/plain")
                    res.statusCode = 400
                    res.end(returnString)
                    return
                } else {
                    console.error(err)
                    res.statusCode = 500
                    res.end()
                    return
                }
            }

            res.setHeader("content-type", "application/json")
            res.statusCode = 200
            res.end(returnString)
            return

        }).listen(this.port, this.address)
    }

    /**
     * Make a query to the database with a connection from a given pool.
     * @param {str} sql the query to run.
     * @param {str} pool  
     * @returns {str}
     */
    async #makeQuery(sql, pool) {
        let returnString
        let connection
        try {
            connection = await pool.getConnection()
            returnString = JSON.stringify(await connection.query(sql,))
        } catch (err) {
            throw err
        } finally {
            if (connection) connection.release()
        }
        return returnString
    }

    /**
     * Initialize a client connection with the database.
     * 
     * @returns {Promise<mariadb.Pool>}
     */
    async #startConnection() {
        if (true) {
            await this.#initializeDatabase()
        }

        const pool = mariadb.createPool({
            host: "localhost",
            port: 3306,
            user: process.env["CLIENT_DB_USER"],
            password: process.env["CLIENT_DB_USER_PASSWORD"],
            database: "comp4537_lab5",
            bigIntAsNumber: true,
            supportBigNumbers: true,
        })

        return pool
    }

    /**
     * Create the database, tables, and client user.
     */
    async #initializeDatabase() {
        const privilegedPool = mariadb.createPool({
            host: "localhost",
            port: 3306,
            user: process.env["PRIVILEGED_DB_USER"],
            password: process.env["PRIVILEGED_DB_USER_PASSWORD"],
            multipleStatements: true,
        })

        let connection
        const sql = fs.readFileSync("sql/init.sql").toString()
        const username = process.env["CLIENT_DB_USER"]
        try {
            connection = await privilegedPool.getConnection();
            await connection.query(sql, [username])
        } catch (err) {
            console.error("Error initializing database:", err);
        } finally {
            if (connection) connection.release();
        }
        privilegedPool.end()
    }
}

const address = "0.0.0.0"
const port = 8005
const server = new Server(address, port)
server.listen()
console.log(`Listening on http://${address}:${port}`)
