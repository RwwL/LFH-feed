const fs = require('fs');
const path = require('path');
const CONFIG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const LOG_PATH = path.resolve(path.join(__dirname, 'lfh-feed.log'));
const JSON_PATH = path.resolve(path.join(__dirname, 'episodes.json'));
const FEED_PATH = path.resolve(path.join(__dirname, 'feed.xml'));
const log = require('simple-node-logger').createSimpleFileLogger(LOG_PATH);
const puppeteer = require('puppeteer');
const Podcast = require('podcast');
const SFTPClient = require('sftp-promises');
const TARGET_URL = 'https://www.livefromhere.org';
const FTP_CONFIG = {
  host: CONFIG.FTP_HOST,
  username: CONFIG.FTP_USER,
  password: CONFIG.FTP_PW
}

const handleError = function(error) {
  const date = new Date().toLocaleDateString();
  log.info(`${date}: ${error}`);
};

const uploadPodcast = function() {
  var sftp = new SFTPClient(FTP_CONFIG);
  sftp.put(FEED_PATH, CONFIG.FTP_FEED_PATH).then(success => {
    const loggingDate = new Date().toLocaleDateString();
    log.info(`${loggingDate}: attempted upload, success: ${success}`);
  }).catch(err => { handleError(err)});
};

const createPodcast = function(episodes) {
  episodes.reverse();
  const feed = new Podcast({
      title: 'Live from Here (full episodes)',
      description: 'Entire episodes scraped from livefromhere.org.',
      feed_url: CONFIG.PUBLISHED_FEED_URL,
      site_url: CONFIG.SITE_URL,
      image_url: CONFIG.IMG_URL,
      author: CONFIG.AUTHOR,
      webMaster: CONFIG.WEBMASTER_EMAIL,
      copyright: 'no copyright claimed',
      language: 'en',
      pubDate: new Date().toGMTString(),
      ttl: '1440',
      categories: ['Music', 'Comedy', 'Live Performance']
  });
  episodes.forEach(episode => {
    feed.addItem({
      title:  episode.title,
      description: 'Entire Live from Here episode for ' + episode.date,
      url: episode.url,
      date: episode.date,
      enclosure: {
        url: episode.url
      }
    });
  });
  const xml = feed.buildXml();
  fs.writeFile(FEED_PATH, xml, (err) => {
    if (err) {
      handleError('failed to write XML');
    } else {
      uploadPodcast();
    }
  });
};

const registerEpisode = function(data) {
  const loggingDate = new Date().toLocaleDateString();
  const episodeDateArray = data.url.split('lfh_')[1].split('.')[0].split('');
  episodeDateArray.splice(4, 0, '.');
  episodeDateArray.splice(7, 0, '.');
  data.date = episodeDateArray.join('');
  data.title = `${data.date}: ${data.title}`;
  log.info(`${loggingDate}: found episode '${data.title}'`);
  fs.exists(JSON_PATH, function(exists){
    if (exists){
      fs.readFile(JSON_PATH, function readEpisodesFile(err, episodesJSON) {
        if (err){
          handleError(err);
        } else {
          const episodesObj = JSON.parse(episodesJSON);
          if (Array.isArray(episodesObj.episodes)) {
            var existing =  episodesObj.episodes.find(function(episode) {
              return episode.date === data.date;
            });
            if (existing) {
              log.info(`found preexisting episode (for ${data.date}) in list; quitting`);
              return;
            } else {
              episodesObj.episodes.push(data);
              if (episodesObj.episodes.length >= 10) {
                episodesObj.episodes.splice(0, 1);
              }
              fs.writeFile(JSON_PATH, JSON.stringify(episodesObj, null, 2), function(err2) {
                if (err2) {
                  handleError(err2);
                } else {
                  createPodcast(episodesObj.episodes);
                }
              });
            }
          } else {
            handleError('invalid episodes.json file');
          }
        }
      });
    } else {
      handleError('no episodes.json');
    }
  });
};

// fetch the page with puppeteer and get latest show data
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage().catch(error => handleError(error));
  await page.goto(TARGET_URL).catch(error => handleError(error));
    const showData = await page.evaluate(() => {
      return {
        url: document.querySelector('#player').getAttribute('data-src'),
        title: document.querySelector('.player_title').innerText
      }
  }).catch(error => handleError(`puppeteer promise rejected: ${error}`));
  registerEpisode(showData);
  await browser.close();
})();
