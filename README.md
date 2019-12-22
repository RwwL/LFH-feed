# LFH-feed
Generate a self-hosted full-episodes RSS feed for APM's Live From Here

The Live from Here radio program distributes only curated highlights in their official podcast feed, but full episodes are hosted on their website. This is a simple script to periodically scrape the site (using [Puppeteer](https://developers.google.com/web/tools/puppeteer)) and generate a full-episodes RSS feed that you can subscribe and listen from your preferred podcast client instead of on the website.

I host a feed at http://lifford.org/LFH-feed/feed.xml, but that's subject to removal at any time.

To host your own, you'll first need an FTP server of your own, then:

* Clone or download this repo.
* Install dependencies with `npm` or `yarn`.
* Open the `config-sample.json` file and fill out your details. The fields starting with `FTP` are for the automatic FTP connection, and the fields after that are for the published feed. The `IMG_URL` field will need to be the final published absolute path of the `lfh-cover-img.jpg` file on your server after FTP transfer.
* Make sure the `index.js` file is executable on your machine.
* Set up a [`cron`](https://en.wikipedia.org/wiki/Cron) task on your machine to run the `index.js` script at regular intervals.