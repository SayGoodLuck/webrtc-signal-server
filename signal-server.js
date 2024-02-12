const ws = require('ws')

const wss = new ws.Server({
    port: 3000
}, () => console.log('Server started at port 3000'))

const type = {
    GET_CODE: 'GET_CODE',
    OFFER: 'OFFER',
    ANSWER: 'ANSWER',
    ICE_CANDIDATES_OBSERVABLE: 'ICE_CANDIDATES_OBSERVABLE',
    ICE_CANDIDATES_VIEWER: 'ICE_CANDIDATES_VIEWER',
    END_CALL: 'END_CALL'
}

const sessions = []

// const session = {
//     sessionId: , // Уникальный идентификатор сессии
//     type: String, // Тип сессии
//     conn: {
//         viewer: WebSocketInstance, // viewer socket client
//         observable:  WebSocketInstance, // observable socket client
//     },
//     data: Any {
//         // Здесь могут быть любые данные, связанные с сессией
//     }
// }

wss.on('connection', function connection(ws, req) {
    ws.on('message', function message(data) {
        let session = JSON.parse(data.toString())
        console.log('New request...')
        console.log(session)
        let foundSession
        switch (session.type) {
            case type.GET_CODE:
                const sessionId = generateCode()
                console.log(`New session id: ${sessionId}`)
                sessions.push({sessionId: sessionId, conn: {viewer: ws, observable: null}})
                sendToClient(ws, {type: 'CODE', sessionId: sessionId})
                break
            case type.OFFER:
                console.log(`New offer request...`)
                foundSession = findSession(session.sessionId)
                if (foundSession) {
                    foundSession.conn.observable = ws;
                    sendToClient(foundSession.conn.viewer, {
                        type: session.type,
                        sessionId: foundSession.sessionId,
                        conn: foundSession.conn.viewer,
                        data: session.data
                    })
                } else {
                    console.log(`Session was not found id: ${session.sessionId}`)
                }
                break
            case type.ANSWER:
                console.log(`New answer request...`)
                foundSession = findSession(session.sessionId)
                if (foundSession) {
                    sendToClient(foundSession.conn.observable, {
                        type: 'ANSWER',
                        sessionId: session.sessionId,
                        data: session.data.sdp
                    })
                } else {
                    console.log(`Session was not found id: ${session.sessionId}`)
                }
                break
            case type.ICE_CANDIDATES_OBSERVABLE:
                console.log(`Observable sending ice candidates`)
                foundSession = findSession(session.sessionId)
                if (!foundSession) {
                    console.log(`Session was not found. Type: ${session.type}`)
                    break
                }
                sendToClient(foundSession.conn.viewer, {
                    type: 'ICE_CANDIDATES',
                    sessionId: session.sessionId,
                    data: session.data
                })
                break
            case type.ICE_CANDIDATES_VIEWER:
                console.log(`Viewer sending ice candidates`)
                foundSession = findSession(session.sessionId)
                if (!foundSession) {
                    console.log(`Session was not found. Type: ${session.type}`)
                    break
                }
                sendToClient(foundSession.conn.observable, {
                    type: 'ICE_CANDIDATES',
                    sessionId: session.sessionId,
                    data: session.data
                })
                break
            case type.END_CALL:
                //todo when reset -> remove session
                console.log(`Viewer send stop calling`)
                foundSession = findSession(session.sessionId)
                if (!foundSession) {
                    console.log(`Session was not found. Type: ${session.type}`)
                    break
                }
                sendToClient(foundSession.conn.observable, {
                    type: 'END_CALL',
                    sessionId: session.sessionId
                })
        }
    })
})

function sendToClient(client, message) {
    client.send(JSON.stringify(message))
}

function findSession(sessionIdToFind) {
    return sessions.find(item => item.sessionId === sessionIdToFind);
}

function generateCode() {
    const instant = new Date().getTime();
    const instantString = instant.toString();
    return parseInt(instantString.slice(-8), 10);
}

function clearSessionsDaily() {
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const millisecondsUntilMidnight = nextMidnight - now;

    setTimeout(() => {
        sessions.length = 0;
        console.log('Sessions cleared at midnight.');

        setInterval(() => {
            sessions.length = 0;
            console.log('Sessions cleared at midnight.');
        }, oneDayInMilliseconds);
    }, millisecondsUntilMidnight);
}

clearSessionsDaily();