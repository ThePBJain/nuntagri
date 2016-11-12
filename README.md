VoicePOC
========
## Synopsis

The **VoicePOC Project** was a proof of concept designed by Pranav Jain to explore [**Conversational Commerce**](https://www.shopify.com/encyclopedia/conversational-commerce). The result was a concept that we call **Conversational Connected Commerce** (C^3). It uses a Natural Language processing tool (NLU) called Wit.ai to read text and convert it into actions that Consensus's connected commerce platform can use to order, search, check information, and more for users. This project should be treated as a platform to connect Consensus's tools to the outside world, through many different channels of [Conversational Commerce](http://venturebeat.com/2016/06/16/the-state-of-bots-11-examples-of-conversational-commerce-in-2016/).

## Code Example

Show what the library does as concisely as possible, developers should be able to figure out **how** your project solves their problem by looking at the code example. Make sure the API you are showing off is obvious, and that your code is short and concise.

## Motivation

This project shows how Consensus could use their platform to expand their services to consumers using alternative user interfaces like voice and text. For the user, such a platform will provide **Convenience**. Conversational bots will allow users to find and order the items they want simply by conversing with them. This tool also has the ability to automatically **reorder** a list of items (Grocery lists or any other list). It makes users lives more convenient by removing the boring and arduous task of weekly grocery shopping! 

Such tools will also allows extreme personalization for suggestions and recommendations we provide to the users based off the conversation history and known preferences. It'll be like having your own personal assistant help you out with your grocery shopping!

## Installation

Provide code examples and explanations of how to get the project.
- Set up an AWS instance with a public ip to connect to third parties, open up port 443 with any IP.
- Give instance a domain name.
- SSH into instance and Install Docker Engine on instance
- Copy private key for access to this git repository into `~/.ssh` on instance.
- Copy SSL certs to home directory to enable HTTPS for container
- The key is: **AWS Instance**
              **13:c1:56:e3:6b:4e:95:eb:e6:6f:41:e8:ef:52:76:cb**
- **Put Dockerfile to home directory on server instance to build container**
```
FROM node:latest
MAINTAINER Pranav Jain "Pranav.Jain@consensuscorp.com"

# Let's hack around setting up ssh key to clone a private github repo.
RUN mkdir -p /root/.ssh
ADD .ssh /root/.ssh
RUN chmod 700 /root/.ssh/id_rsa

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Clone our private GitHub Repository
RUN git clone git@ghe.consensuscorpdev.com:pjain/VoicePOC.git .
# Copy all the SSL certs into the container
COPY STAR_consensuscorpdev_com.key STAR_consensuscorpdev_com.key
COPY STAR_consensuscorpdev_com.crt STAR_consensuscorpdev_com.crt
COPY STAR_consensuscorpdev_com.ca-bundle STAR_consensuscorpdev_com.ca-bundle

# Install app dependencies
RUN npm install

# Clean up

EXPOSE 443
CMD [ "npm", "start" ]
```
- Build dockerfile by running `docker build --no-cache -t pranajain/fbot .`
- Start container with proper config variables like this: `Write code here`
- Refer to this [Facebook Messenger Bot tutorial](https://github.com/jw84/messenger-bot-tutorial) to figure out how to set up the facebook webhook to your server, so our bot can send and recieve call from Messenger.
- Add yourself as a tester for the bot in the Roles section of the developers.facebook.com app.
- Set up Rpi to send calls to domain name.

####**WARNING**
If you are planning on using this for a production scale platform with many people using this service, **you need to contact wit.ai** and inform them that you are going to hit their API heavily (sustained rate of 1 request/sec).

## API Reference

Depending on the size of the project, if it is small and simple enough the reference docs can be added to the README. For medium size to larger projects it is important to at least provide a link to where the API reference docs live.

## Tests

Describe and show how to run the tests with code examples.

## Contributors

Let people know how they can dive into the project, include important links to things like issue trackers, irc, twitter accounts if applicable.

If you would like to improve or build on what I have done, you will need to adjust mostly just the `server.js` file. That is where the wit.ai bot recieves the message and handles the actions and the responses. 

To adjust how the wit.ai bot understands the messages, add a process flow to the bot, or improve its understanding, go to the website [wit.ai](https://wit.ai/pranavjain) and log in with the facebook account that I have set up for you guys (pranav.jain@Consensuscorp.com). 

## License

A short snippet describing the license (MIT, Apache, etc.)
