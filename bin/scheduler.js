#!/usr/bin/env node

/**
 * Module dependencies.
 */

const amqpUrl = process.env.URL_AMQP;
const projectsUrl = process.env.URL_API_PROJECTS;
const crawlerConfig = process.env.REGEX;
const _ = require('lodash');
const cron = require('node-cron');
const amqp = require('amqplib/callback_api');

// End of dependencies.

const EXCHANGE = 'crawl';

// start the scheduler that will trigger the audits according to the pattern
// define in the config file
cron.schedule(crawlerConfig, () => {
  console.log('starting audits...');
  audit();
});
console.log('scheduler started');

/**
 * Loads all the projects from the db and run the audit of each of them by
 * creating a crawling task.
 */
function audit() {
  amqp.connect(amqpUrl, (err, conn) => {
    if (err) return console.log(err);
    console.log('connected to node');
    conn.createChannel((err, ch) => {
      if (err) console.log(err);
      console.log('connected to channel');
      ch.assertExchange(EXCHANGE, 'fanout', { durable: true });
      // loop through the projects and send a crawl task
      let url = `${projectsUrl}/api/projects`;
      console.log(`exchange is ok. now getting projects from ${url}`);
      fetch(url)
        .then(response => response.json())
        .then(projects => {
          _.each(projects, project => {
            const message = JSON.stringify({
              url: project.url,
              project: project._id, // eslint-disable-line
              amqpUrl
            });
            ch.publish(EXCHANGE, '', Buffer.from(message));
            console.log(`message published: ${message}`);
          });
        })
        .catch(error => console.log(error));
      setTimeout(() => { // close the rabbitmq connection
        conn.close();
      }, 5000);
    });
  });
}

module.exports = {
  audit
};
