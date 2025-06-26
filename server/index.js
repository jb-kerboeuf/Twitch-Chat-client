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
                let messageNodeList = document.querySelectorAll('.chat-line__message-container, .user-notice-line');
                let messageArray = [];
                for (var i = 0; i < messageNodeList.length; i++) {
                    const noticeNode = messageNodeList[i].querySelector('.dJfBsr'); // Warning: prone to change
                    if (noticeNode) {
                        const userNode = messageNodeList[i].querySelector('span.chatter-name');
                        messageArray[i] = {
                            user: userNode ? userNode.textContent : "???",
                            color: messageNodeList[i].style ? messageNodeList[i].style['border-left-color'] : "currentColor",
                            badge: null,
                            message: {
                                type: 'notice',
                                quote: null,
                                text: noticeNode.innerHTML.replaceAll('@', '&#64;')
                            }
                        };
                    }
                    else {
                        const quoteNode = messageNodeList[i].querySelector('.eWyliK, .iWlGez'); // Warning: prone to change
                        const badgeNode = messageNodeList[i].querySelector('button[data-a-target="chat-badge"]');
                        const userNode = messageNodeList[i].querySelector('span.chat-author__display-name');
                        const textNode = messageNodeList[i].querySelector('span[data-a-target="chat-line-message-body"]');
                        const highlighted = messageNodeList[i].querySelector('span.chat-line__message-body--highlighted');
                        messageArray[i] = {
                            user: userNode ? userNode.textContent : "???",
                            color: userNode ? userNode.style.color : "currentColor",
                            badge: badgeNode ? badgeNode.innerHTML : null,
                            message: {
                                type: highlighted ? 'highlight' : 'message',
                                quote: quoteNode ? quoteNode.innerHTML.replace('Répond à ', '').replaceAll('@', '&#64;') : null,
                                text: textNode ? textNode.innerHTML.replaceAll('@', '&#64;') : ""
                            }
                        };
                    }
                }
                return messageArray;
            });

            // Find new messages 
            let newMessages = [];
            let lastMessageIdx;
            if (lastExtractedMessage) {
                lastMessageIdx = -1;
                for (var i = -1; i > -chat.length; i--) {
                    if (chat.at(i).message.text == lastExtractedMessage.message.text) {
                        lastMessageIdx = i;
                        break;
                    }
                }
                newMessages = lastMessageIdx == -1 ? [] : chat.slice(i + 1);
            }
            else {
                newMessages = chat;
            }

            if (newMessages.length > 50) {
                console.log("That's too much messages at once: " + newMessages.length);
                newMessages = chat.slice(-50);
            }

            // Save extracted messages
            if (newMessages.length > 0) {
                for (var i = 0; i < newMessages.length; i++) {
                    if (i == 0 || (newMessages.at(i).user != newMessages.at(i - 1).user && newMessages.at(i).message.text != newMessages.at(i - 1).message.text)) {
                        if (newMessages.at(i).message.text != "") {
                            newMessages.at(i).message.id = uid;
                            uid++;
                            lastExtractedMessage = newMessages.at(i);
                            io.emit('message', newMessages.at(i)); // Broadcasting the message to all clients
                        }
                        else {
                            console.log('Unrecognized message ' + JSON.stringify(newMessages.at(i)));
                        }
                    }
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