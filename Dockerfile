FROM mcr.microsoft.com/playwright:focal
RUN mkdir -p /home/pwuser/app && chown -R pwuser:pwuser /home/pwuser/app
WORKDIR /home/pwuser/app
COPY . .
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD 1
RUN npm ci
RUN npm run build
USER pwuser
RUN cd /home/pwuser/app
ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
