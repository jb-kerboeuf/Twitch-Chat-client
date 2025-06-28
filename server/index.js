const express = require("express");
const http = require("http").createServer();
const io = require("socket.io")(http, {
    cors: {
        origin: "*",
    },
});
const cors = require("cors");
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;
const URL = 'https://www.twitch.tv/popout/YOUR_TWITCH_ID/chat?popout=';

// Enable CORS for all requests
app.use(cors());

// Define a route handler for the root path
app.get("/", (req, res) => {
    res.send("Hello, world!");
});

// Handling Client Connections and Disconnections
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('message', (data) => {
        console.log('Received message???', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    (async () => {
        // Start browser
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(URL);
        await page.waitForSelector('.chat-line__message-container');
        console.log('Puppeteer activated')

        let lastExtractedMessage = null;
        let uid = 0;

        while (true) {
            // Evaluate the page
            let chat = await page.evaluate(() => {
                const messageNodeList = document.querySelectorAll('.chat-line__message, .user-notice-line, .announcement-line');
                const hypeTrainNode = document.querySelector('.hype-train__banner');

                let messageArray = [];
                for (var i = 0; i < messageNodeList.length; i++) {
                    const userNode = messageNodeList[i].querySelector('span.chat-author__display-name, span.chatter-name');
                    const noticeNode = messageNodeList[i].querySelector('.dJfBsr, .hDlHnO'); // Warning: prone to change
                    if (noticeNode) {
                        messageArray[i] = {
                            train: hypeTrainNode ? true : false,
                            user: userNode ? userNode.textContent : "???",
                            color: "var(--accent-color)",
                            badge: null,
                            message: {
                                type: 'notice',
                                text: noticeNode.innerHTML.replaceAll('@', '&#64;')
                            }
                        };
                    }
                    else {
                        const badgeNode = messageNodeList[i].querySelector('button[data-a-target="chat-badge"]');
                        const textNode = messageNodeList[i].querySelector('span[data-a-target="chat-line-message-body"]');
                        const announceNode = messageNodeList[i].querySelector('.jmdYJS'); // Warning: prone to change
                        if (announceNode) {
                            messageArray[i] = {
                                train: hypeTrainNode ? true : false,
                                user: userNode ? userNode.textContent : "???",
                                color: "var(--accent-color)",
                                badge: badgeNode ? badgeNode.innerHTML : null,
                                message: {
                                    type: 'announce',
                                    text: textNode ? textNode.innerHTML.replaceAll('@', '&#64;') : ""
                                }
                            };
                        }
                        else {
                            const highlighted = messageNodeList[i].querySelector('span.chat-line__message-body--highlighted');
                            const animated = messageNodeList[i].querySelector('.animatedMessageContainer');
                            const quoteNode = messageNodeList[i].querySelector('.eWyliK, .iWlGez'); // Warning: prone to change
                            messageArray[i] = {
                                train: hypeTrainNode ? true : false,
                                user: userNode ? userNode.textContent : "???",
                                color: userNode ? userNode.style.color : "currentColor",
                                badge: badgeNode ? badgeNode.innerHTML : null,
                                message: {
                                    type: highlighted ? 'highlight' : animated ? 'animated' : 'message',
                                    quote: quoteNode ? quoteNode.innerHTML.replace('Répond à ', '').replaceAll('@', '&#64;') : null,
                                    text: textNode ? textNode.innerHTML.replaceAll('@', '&#64;') : ""
                                }
                            };
                        }
                    }
                }
                return messageArray;
            });

            // Find new messages 
            let newMessages = [];
            let lastMessageIdx = null;
            if (lastExtractedMessage) {
                for (var i = 0; i >= -chat.length; i--) {
                    if (chat.at(i).user == lastExtractedMessage.user && chat.at(i).message.text == lastExtractedMessage.message.text) {
                        lastMessageIdx = i;
                        break;
                    }
                }
                newMessages = lastMessageIdx == -1 ? [] : chat.slice(lastMessageIdx + 1);
            }
            else {
                newMessages = chat;
            }

            if (newMessages.length > 50) {
                console.error("Error: lost track of messages");
                newMessages = chat.slice(-1);
            }

            // Emit extracted messages
            for (var i = 0; i < newMessages.length; i++) {
                if (newMessages[i].message.text != "") {
                    newMessages[i].message.id = uid;
                    uid++;
                    lastExtractedMessage = newMessages[i];
                    io.emit('message', newMessages[i]); // Broadcasting the message to all clients
                }
                else {
                    console.error('Unrecognized message:\n' + JSON.stringify(newMessages[i]) + '\n');
                }
            }
        }
    })();
});

// Start the server
http.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}