const puppeteer = require('puppeteer');
const { douyin: dUsers, xiaohongshu: xUsers } = require('./ids.js');
const fs = require('fs');

class Spider {
  userBaseUrl = '';
  page = null;
  videos = [];

  constructor(users, userBaseUrl) {
    this.users = users;
    this.userBaseUrl = userBaseUrl;
  }

  async init() {
    const browser = await puppeteer.launch({
      headless: true,
      // ignoreDefaultArgs: true,
      // pipe: true,
      args: [
        //--flag-switches-begin
        //--enable-features=ExperimentalProductivityFeatures,LazyFrameLoading,LazyImageLoading,ParallelDownloading,TabGroups,TabHoverCards
        //--flag-switches-end
      ]
      // executablePath: `/Applications/Microsoft\ Edge\ Dev.app/Contents/MacOS/Microsoft\ Edge\ Dev`
    });
    this.page = await browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.119 Safari/537.36');
    // await this.page.emulate(puppeteer.devices['iPhone 8']);
    const cb = this.getRequestCallback();

    if (cb) {
      this.page.on('response', async resp => {
        const data = await cb(resp);
        if (data) {
          const videos = data.map(this.parse)[0];
          this.videos = this.videos.concat(videos);
          console.log(videos);
        }
      });
    }
  }

  getUserPageUrl(userId) {
    return `${this.userBaseUrl}/${userId}`;
  }

  getRequestCallback() {
    return null;
  }

  async getVideosFromDom() {
    return null;
  }

  async parseVideos(userId) {
    const url = this.getUserPageUrl(userId);
    await this.page.goto(url);
    const videos = await this.getVideosFromDom();
    if (videos && videos.length > 0) {
      return videos.map(v => this.parse(v));
    }
  }

  parse(video) {
    return {
      author: '',
      title: '',
      link: '',
      cover: ''
    };
  }

  async start() {
    await this.init();
    for (const u of this.users) {
      const videos = await this.parseVideos(u);
      if (videos) {
        this.videos = this.videos.concat(videos);
      }
    }
    await this.generatePage();
  }

  async generatePage() {
    const html = `
<html>
<meta charset="UTF-8"/>
<title>零食网红近期更新</title>
<style>
 table {
  border-collapse: collapse;
 }
 th, td {
  border: 1px #ccc solid;
  padding: 5px 10px;
 }
 img {
 width: 150px;
 }
</style>
<body>
<table>
<thead>
  <tr>
    <th>作者</th>
    <th>标题</th>
    <th>封面</th>
    <th>链接</th>
  </tr>
</thead>
<tbody>
  ${this.videos.map(v => {
      const paths = v.link.replace('https://', '').split('/');
      paths.shift();
      const url = `https://www.xiaohongshu.com/${paths.join('/')}`;
      return `<tr><td>${v.author}</td><td>${v.title}</td><td><img src="${v.cover}"/></td><td><a target="_blank" href="${url}">${url}</a></td></tr>`;
    }).join('')}
</tbody>
</table>
</body>    
</html>
    `;
    fs.writeFileSync('./out/index.html', html, { encoding: 'utf8' });
    await this.page.browser().close();
  }
}

class DySpider extends Spider {
  constructor() {
    super(dUsers, 'https://www.iesdouyin.com/share/user');
  }

  getRequestCallback() {
    return async resp => {
      const url = resp.url();
      if (url.includes(`iesdouyin.com/web/api/v2/aweme/post/?user_id=`)) {
        return await resp.json().then(data => {
          console.log(data);
          return data.aweme_list;
        });
      }
    };
  }

  parse(video) {
    const covers = video.video.cover.url_list;
    const cover = covers[covers.length - 1];
    const author = video.author.nickname;
    const title = video.desc;
    const link = video.aweme_id;
    return { cover, author, title, link };
  }
}

class XhsSpider extends Spider {
  constructor() {
    super(xUsers, 'https://www.xiaohongshu.com/user/profile');
  }

  async getVideosFromDom() {
    const notes = await this.page.waitForFunction(`window.__INITIAL_SSR_STATE__`);
    const list = await notes.jsonValue();
    return list.Main.notesDetail.map(n => {
      return {
        author: n.user.nickname,
        title: n.title,
        cover: n.cover.url,
        link: n.link
      };
    });
  }

  parse(video) {
    return video;
  }
}

// new DySpider().start();
new XhsSpider().start();

/*
JSDOM.fromURL(`https://www.iesdouyin.com/share/user/435006493956142`, {
  resources: new ResourceLoader({
    strictSSL: false,
    userAgent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.119 Safari/537.36'
  }),
  runScripts: 'dangerously',
  pretendToBeVisual: true
})
  .then(jsdom => {
    const win = jsdom.window;
    const doc = win.document;
    setInterval(() => {
      console.log(doc.getElementById('pagelet-worklist').innerHTML);
    }, 1000);
    const clickEvent1 = new win.MouseEvent('clcik');
    const clickEvent2 = new win.MouseEvent('clcik');
    const like = doc.querySelector('[data-type=like]');
    const works = doc.querySelector('[data-type=post]');
    const tab = doc.querySelector('.video-tab');

    setTimeout(() => {
      like.dispatchEvent(clickEvent1);
      like.click();
      setTimeout(() => {
        works.dispatchEvent(clickEvent2);
        works.click();
      }, 1000)
    }, 3000);
  });
*/
