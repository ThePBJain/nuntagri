FROM node:lts
MAINTAINER Pranav Jain "pranajain@gmail.com"

ARG STRIPE_PUBLISHABLE_KEY_ARG
ARG STRIPE_SECRET_KEY_ARG
ARG SECRET_ARG
ARG TWILIO_ACCOUNT_SID_ARG
ARG TWILIO_AUTHTOKEN_ARG
ARG SENDGRID_API_KEY_ARG
ARG MYSQL_HOST_ARG
ARG MYSQL_USER_ARG
ARG MYSQL_PASS_ARG


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
ENV STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY_ARG
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_ARG
ENV SECRET=$SECRET_ARG
ENV TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID_ARG
ENV TWILIO_AUTHTOKEN=$TWILIO_AUTHTOKEN_ARG
ENV SENDGRID_API_KEY=$SENDGRID_API_KEY_ARG
ENV MYSQL_HOST=$MYSQL_HOST_ARG
ENV MYSQL_USER=$MYSQL_USER_ARG
ENV MYSQL_PASS=$MYSQL_PASS_ARG
ENV NODE_ENV=development
ENV PORT=5000
#Fixing Timezone
ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Clean up

EXPOSE 5000
CMD [ "npm", "start" ]
