FROM mcr.microsoft.com/playwright:focal

# Install aws-lambda-ric build dependencies
RUN apt-get update && apt-get install -y \
    g++ \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    autoconf \
    libtool

# Define custom function directory
ARG FUNCTION_DIR="/function"

# Create function dir and install node packages
RUN mkdir -p ${FUNCTION_DIR}
RUN chown -R pwuser:pwuser ${FUNCTION_DIR}
COPY . ${FUNCTION_DIR}
WORKDIR ${FUNCTION_DIR}
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD 1
RUN npm ci
RUN npm install aws-lambda-ric
RUN npm run build

# Add Lambda Runtime Interface Emulator and use a script in the ENTRYPOINT for simpler local runs
ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/local/bin/aws-lambda-rie
RUN chmod 755 /usr/local/bin/aws-lambda-rie
COPY entrypoint.sh /
RUN chmod 755 /entrypoint.sh
ENTRYPOINT [ "/entrypoint.sh" ]

USER pwuser
CMD ["dist/handler.handler"]
