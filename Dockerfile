FROM node:lts
MAINTAINER Pranav Jain "pranajain@gmail.com"


# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Clone our private GitHub Repository
#RUN git clone https://github.com/ThePBJain/nuntagri.git .
#COPY .env .
COPY . .
# Copy all the SSL certs into the container
#COPY /nuntagri.com-0001/fullchain.pem cert.pem
#COPY /nuntagri.com-0001/privkey.pem privkey.pem
# Install app dependencies
RUN npm install

ENV RUN_ENV=mongo
#Fixing Timezone
ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Clean up

EXPOSE 5000
CMD [ "npm", "start" ]
