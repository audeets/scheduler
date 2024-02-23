import cron from "node-cron";
import amqp from "amqplib/callback_api.js";

const EXCHANGE = "audit";
const amqpUrl = process.env.URL_AMQP;
const projectsUrl = process.env.URL_API_PROJECTS;
const crawlerConfig = process.env.REGEX;

// start the scheduler that will trigger the audits according to the pattern
// define in the config file
cron.schedule(crawlerConfig, () => {
  console.log("starting audits...");
  startAudits();
});
console.log("scheduler started");

/**
 * Loads all the projects from the db and run the audit for
 * each of the URLs defined.
 */
function startAudits() {
  amqp.connect(amqpUrl, (err, conn) => {
    if (err) return console.log(err);
    console.log("connected to node");
    conn.createChannel((err, ch) => {
      if (err) console.log(err);
      console.log("connected to channel");
      ch.assertExchange(EXCHANGE, "fanout", { durable: true });
      // loop through the projects and send a crawl task
      let url = `${projectsUrl}/api/projects`;
      console.log(`exchange is ok. now getting projects from ${url}`);
      fetch(url, { headers: { "API-Key": process.env.API_KEY } })
        .then((response) => response.json())
        .then((projects) => {
          projects.forEach((project) => {
            project.urls.forEach((url) => {
              const message = JSON.stringify({
                url: `https://${project.domain}${url}`,
                project: project._id,
                nodeUrl: amqpUrl,
              });
              ch.publish(EXCHANGE, "", Buffer.from(message));
              console.log(`message published: ${message}`);
            });
          });
        })
        .catch((error) => console.log(error));
      setTimeout(() => {
        // close the rabbitmq connection
        conn.close();
      }, 5000);
    });
  });
}

export default { startAudits };
