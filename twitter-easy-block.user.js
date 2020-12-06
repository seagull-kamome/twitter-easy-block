// ==UserScript==
// @name        twitter-easy-block
// @namespace   https://github.com/seagull-kamome/twitter-easy-block/
// @version     0.1
// @description Add 1-click block button on tweet, Chain block.
// @author      HATTORI, Hiroki
// @run-at      document-end
// @updateURL   https://raw.githubusercontent.com/seagull-kamome/twitter-easy-block/master/twitter-easy-block.user.js
// @match       https://twitter.com/*
// @match       https://mobile.twitter.com/*
// @match       https://tweetdeck.twitter.com/*
// @resource    REGEXP_ZH https://raw.githubusercontent.com/seagull-kamome/unicode-regexp/master/regexp_zh.txt
// @require     https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
// @require     https://cdn.jsdelivr.net/npm/qs/dist/qs.min.js
// @grant       GM_getResourceText
// @grant       GM_registerMenuCommand
// ==/UserScript==
(_ => {
  'use strict';

  const regexp_zh_str = GM_getResourceText('REGEXP_ZH');
  const regexp_zh = (regexp_zh_str === '')? null : new RegExp(regexp_zh_str, 'u');
  const regexp_kr =  /[\u{ac00}-\u{afff}]/u;

  const TROLL_WORDS_REGEXP = new RegExp(
    'nmsl|[にニ][まマ][すス][らラ]|[にニ][まマ][びビ]'
    + '|マホRPGは今これをやってるよ|参戦ID.*参加者募集！'
    + '|#(?:桐生ココ(?:引退|政治系Vtuber|はRCEP締結の元凶))'
    , 'iu');
  const TROLL_NICKNAME = new RegExp(
   '^(?:Jesus$|COVER豬式會社)'
   + '|エバーライフ|バッタ殺|は引退しろ'
   , 'iu');
  const HASHTAGS_LIMIT = 7;
  const NUM_BUDDA_FACES = 3;

  /* ********************************************************************** */

  var accounts = {};
  const get_account_info = x => {
    if (! (x in accounts)) {
      var tmp = {
        typ: 'NEW',
        createdAt: (new Date()).getTime(),
        count: 0,
        tweetTimestamps: {}, };
      accounts[x] = tmp;
      return tmp;
    }
    return accounts[x];
  };



  /* ********************************************************************** */

  const get_cookie = k => {
    const kk = k + '=';
    const y = document.cookie.split(';').map(x => x.trim()).find(x => x.indexOf(kk) === 0);
    return y? y.substring(kk.length, y.length) : ''; };
  const ajax = axios.create({
    baseURL: 'https://api.twitter.com',
    withCredentials: true,
    headers: {
      'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Active-User': 'yes',
      'X-Csrf-Token': get_cookie('ct0') }  });
  const block_account = async id => {
    get_account_info(id).typ = 'BLOCKED';
    ajax.post('/1.1/blocks/create.json',
      Qs.stringify({ screen_name: id, skip_status: true }),
      { headers: {
        'Content-Type': 'application/x-www-form-urlencoded' } })};

  GM_registerMenuCommand('Show trolls',
    _ => alert(Object.keys(accounts)
      .filter(k => accounts[k].typ === 'TROLL')
      .join('/')) );
  GM_registerMenuCommand('Block trolls',
    _ => Object.keys(accounts).filter(k => accounts[k].typ === 'TROLL')
           .forEach(block_account));


  /* ********************************************************************** */

  const detector = article => {
    const elm = article.querySelector(':scope div[data-testid=\'tweet\'] > div:nth-of-type(2)');
    if (!elm) return ;

    // Get author information.
    const lnks = elm.querySelectorAll(':scope > div:nth-of-type(1) a[href]');
    if (lnks.length == 1) { // promotion
    return;
    } else if (lnks.length > 2) {
      console.log('BUG: bad anchor count.');
      return ; /* something wrong. */
    }

    const author_name = lnks[0].innerText.split(/\r?\n/)[0];
    const [_, author_id, tweet_id] = lnks[1].getAttribute('href').match(/^\/([^\/\?]*)(?:\/status\/([0-9]*))$/)
                                  || ['', '', ''];
    //console.log(author_id + ' : ' + tweet_id + ' : ' + author_name);

    let author_info = get_account_info(author_id);
    article.setAttribute('tweb-processed', 'true');
    const hide_tweet = b => {
      if (b) author_info.typ = 'TROLL';
      const c = article.parentNode.parentNode;
      c.style.display = 'none';
      c.style.visibility = 'hidden';
      /* article.parentNode.remove(article); */ /* NOTE: removing will error occurs */ };

    if (author_info.typ === 'TROLL' || author_info.typ === 'BLOCKED') {
      hide_tweet(false);
    } else {
      // Get message.
      const msg = elm.querySelector(':scope > div:nth-of-type(2) div[lang]');
      const lang = msg.getAttribute('lang') || '';
      const message = (msg? msg.innerText : '').replace(/(?:\r?\n|\s)+/ig, ' ');

      if (TROLL_NICKNAME.test(author_name)
        || TROLL_WORDS_REGEXP.test(author_name)) {
        hide_tweet(true);
      } else if (TROLL_WORDS_REGEXP.test(message)
              || msg.querySelectorAll('a[href^=\'/hashtag/\']').length > HASHTAGS_LIMIT) {
        hide_tweet(++author_info.count > NUM_BUDDA_FACES);
      } else if (lang == 'zh' || lang == 'kr'
              || (regexp_zh !== null && regexp_zh.test(author_name + message))
              || (regexp_kr !== null && regexp_kr.test(author_name + message)) ) {
        hide_tweet(false);
      }
    }
  };




  /* ********************************************************************** */
  const install_observer = _ => {
    const twmain = document.querySelector('main[role=\'main\']');
    if (!twmain) {
      window.setTimeout(install_observer, 100);
      return ;
    }


    var last_processed_time = new Date().getTime() - 1000;
    var respawn_scheduled = false;
    const watch_cycle = _ => {
      if (respawn_scheduled) return ;

      const t = new Date().getTime();
      if (t < last_processed_time + 200) {
        respawn_scheduled = true;
        window.setTimeout(_ => { respawn_scheduled = false; watch_cycle(); },
          last_processed_time + 200 - t);
        return ;
      }
      last_processed_time = t;

      twmain.querySelectorAll('article:not([tweb-processed])')
        .forEach(x => { detector(x); });
    };


    (new MutationObserver(_ => watch_cycle()))
      .observe(twmain, { childList: true, subtree: true });
  };
  install_observer();

})();

// vim: tw=80 ts=8 sw=2 expandtab :

