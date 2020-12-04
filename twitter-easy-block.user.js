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
// @resource    REGEXP_KR https://raw.githubusercontent.com/seagull-kamome/unicode-regexp/master/regexp_zhkrxt
// @require     https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
// @grant       GM_getResourceText
// ==/UserScript==
(_ => {
  'use strict';

  const regexp_zh_str = GM_getResourceText('REGEXP_ZH');
  const regexp_zh = (regexp_zh_str === '')? null : new RegExp(regexp_zh_str, 'u');
  const regexp_kr_str = GM_getResourceText('REGEXP_KR');
  const regexp_kr = (regexp_kr_str === '')? null : new RegExp(regexp_kr_str, 'u');

  const TROLL_WORDS_REGEXP = new RegExp(
    'nmsl|[にニ][まマ][すス][らラ]|[にニ][まマ][びビ]'
    + '|マホRPGは今これをやってるよ|参戦ID.*参加者募集！'
    + '|#(?:桐生ココ引退)'
    , 'iu');
  const TROLL_SCREENNAME = /^(?:Jejus)$/iu;
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

  {
    const get_cookie = k => {
      const kk = k + '=';
      const y = document.cookie.split(';').find(x => x.indexOf(kk) == 0);
      return y? y.substring(kk.length, y.length) : ''; };
    const ajax = axios.create({
      baseURL: 'https://api.twitter.com',
      withCredentials: true,
      headers:
      { 'Authorization': 'Bearer xxxxxxxxxxxx'
        , 'X-Twitter-Auth-Type': 'OAuth2Session'
        , 'X-Twitter-Active-User': 'yes'
        , 'X-Csrf-Token': get_cookie('ct0') }  });
    const blocker_cycle = _ => {
      Object.keys(accounts)
        .filter(k => accounts[k].typ == 'TROLL')
        .forEach(k => ajax.post('/1.1/blocks/create.json'
          , { user_id: id, skip_status: 1 }
          , { headers: {
            'Content-Type': 'application/x-www-form-urlencoded' } }) );
      window.setTimeout(blocker_cycle, 60000); };

    // window.setTimeout(blocker_cycle, 60000);
  }


  /* ********************************************************************** */

  const hide_tweet = x => {
   const c = x.parentNode.parentNode;
    c.style.display = 'none';
    c.style.visibility = 'hidden';
    x.parentNode.remove(x);
    };

  const detector = x => {
    //
    const elm = x.querySelector(':scope div[data-testid=\'tweet\'] > div:nth-of-type(2)');
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
    if (author_info.typ == 'TROLL') { hide_tweet(x); return; }

    // Get message.
    const msg = elm.querySelector(':scope > div:nth-of-type(2) div[lang]');
    const lang = msg.getAttribute('lang') || '';
    const message = (msg? msg.innerText : '').replace(/(?:\r?\n|\s)+/ig, ' ');

    if (TROLL_SCREENNAME.test(author_name) ) {
      hide_tweet(x);
      author_info.typ = 'TROLL';
    } else if (TROLL_WORDS_REGEXP.test(author_name + message)
            || msg.querySelectorAll('a[href^=\'/hashtag/\']').length > HASHTAGS_LIMIT) {
      hide_tweet(x);
      if (++author_info.count >= NUM_BUDDA_FACES) { author_info.typ = 'TROLL'; }
    } else if (lang == 'zh' || lang == 'kr'
            || (regexp_zh !== null && regexp_zh.test(author_name + message))
            || (regexp_kr !== null && regexp_kr.test(author_name + message)) ) {
      hide_tweet(x);
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

      twmain.querySelectorAll('article:not([visibility=\'hidden\'])')
        .forEach(x => { detector(x); });
    };


    (new MutationObserver(_ => watch_cycle()))
      .observe(twmain, { childList: true, subtree: true });
  };
  install_observer();

})();

// vim: tw=80 ts=8 sw=2 expandtab :

