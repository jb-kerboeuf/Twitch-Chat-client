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

        let extractedMessages = [];

        while (true) {
            // Evaluate the page
            let chat = await page.evaluate(() => {
                let messageNodeList = document.querySelectorAll('.chat-line__message-container');
                let messageArray = [];
                for (var i = 0; i < messageNodeList.length; i++) {
                    const quoteNode = messageNodeList[i].querySelector('.eWyliK');
                    const badgeNode = messageNodeList[i].querySelector('button[data-a-target="chat-badge"]');
                    const userNode = messageNodeList[i].querySelector('span.chat-author__display-name');
                    const textNode = messageNodeList[i].querySelector('span[data-a-target="chat-line-message-body"]');
                    messageArray[i] = {
                        user: userNode ? userNode.innerHTML : "???",
                        color: userNode ? userNode.style.color : "white",
                        badge: badgeNode ? badgeNode.innerHTML : null,
                        message: {
                            quote: quoteNode ? quoteNode.innerHTML.replace('Répond à ', '').replaceAll('@', '&#64;') : null,
                            text: textNode ? textNode.innerHTML.replaceAll('@', '&#64;') : ""
                        }
                    };
                }
                return messageArray;
            });

            // Realign extractedMessages array with the new evaluated page 
            while (extractedMessages.length > 0 && chat.at(0).message.text != extractedMessages.at(0).message.text) {
                extractedMessages.shift();
            }
            const newMessages = chat.slice(extractedMessages.length);

            // Save extracted messages
            if (newMessages.length != 0) {
                for (var i = 0; i < newMessages.length; i++) {
                    extractedMessages.push(newMessages.at(i));
                    // console.log('beep boop');
                    io.emit('message', newMessages.at(i)); // Broadcasting the message to all clients
                }
            }
            else {
                await delay(500);
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