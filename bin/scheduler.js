#!/usr/bin/env node

/**
 * Module dependencies.
 */

const config = require('config');
const amqpConfig = config.get('amqp');
const crawlerConfig = config.get('crawler');
const _ = require('lodash');
const cron = require('node-cron');
const amqp = require('amqplib/callback_api');
const http = require('http');
const URL = require('url');

// End of dependencies.

const EXCHANGE = 'crawl';

// start the scheduler that will trigger the audits according to the pattern
// define in the config file
cron.schedule(crawlerConfig.schedule, () => {
  console.log('starting audits...');
  audit();
});
console.log('scheduler started');

/**
 * Retrieves the list of projects fron the Projects API.
 * @param {*} callback the callback to return the projects
 */
function getProjects(callback) {
  const options = new URL(`${config.hosts.apiProjects}/api/projects`);
  console.log('preparing GET request to projects API...');
  const req = http.request(options, res => {
    console.log('getting response');
    res.setEncoding('utf8');
    let responseString = '';
    res.on('data', chunk => {
      console.log(`got chunk ${chunk}`);
      responseString += chunk;
    });
    res.on('end', () => {
      console.log('reponse ended.');
      callback(null, JSON.parse(responseString));
    });
  });

  req.on('error', e => {
    callback(`problem with request: ${e.message}`);
  });

  req.end();
}

/**
 * Loads all the projects from the db and run the audit of each of them by
 * creating a crawling task.
 * @param {function} done when done
 */
function audit(done) {
  const nodeUrl = amqpConfig.connect;
  amqp.connect(nodeUrl, (err, conn) => {
    if (err) return console.log(err);
    console.log('connected to node');
    conn.createChannel((err, ch) => {
      if (err) console.log(err);
      console.log('connected to channel');
      ch.assertExchange(EXCHANGE, 'fanout', {durable: true});
      console.log('exchange is ok. now getting projects');
      // loop through the projects and send a crawl task
      getProjects((err, projects) => {
        if (err) console.log(err);
        console.log(`found ${projects.length} projects`);
        return _.each(projects, project => {
          const message = JSON.stringify({
            url: project.url,
            project: project._id, // eslint-disable-line
            nodeUrl
          });
          ch.publish(EXCHANGE, '', new Buffer(message));
          console.log(`message published: ${message}`);
        });
      });
      setTimeout(() => { // close the rabbitmq connection
        conn.close();
        if (done) done();
      }, 5000);
    });
  });
}

module.exports = {
  audit
};
