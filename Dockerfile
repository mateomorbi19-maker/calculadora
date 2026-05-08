FROM nginx:alpine

COPY index.html styles.css calculator.js /usr/share/nginx/html/

EXPOSE 80
