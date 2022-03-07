// ==UserScript==
// @name         Ustream.to
// @description  Watch videos in external player.
// @version      1.0.0
// @match        *://ustream.to/*
// @match        *://*.ustream.to/*
// @icon         https://www.ustream.to/favicon.ico
// @run-at       document-end
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-Ustream-to/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-Ustream-to/issues
// @downloadURL  https://github.com/warren-bank/crx-Ustream-to/raw/webmonkey-userscript/es5/webmonkey-userscript/Ustream-to.user.js
// @updateURL    https://github.com/warren-bank/crx-Ustream-to/raw/webmonkey-userscript/es5/webmonkey-userscript/Ustream-to.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "common": {
    "debug":                        true,
  },
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

// ----------------------------------------------------------------------------- state

var $globals = {
  eval: unsafeWindow.window.eval.bind(unsafeWindow.window)
}

unsafeWindow.window.eval = unsafeWindow.console.log.bind(unsafeWindow.console)

// ----------------------------------------------------------------------------- helpers

var resolve_url = function(url, allow_blank) {
  if (!url)
    return null

  if (url === 'about:blank')
    return allow_blank ? url : null

  if (url.substr(0,4).toLowerCase() === 'http')
    return url

  var loc = unsafeWindow.location

  if (url.substr(0,2) === '//')
    return loc.protocol + url

  if (url.substr(0,1) === '/')
    return loc.protocol + '//' + loc.hostname + url

  var index = loc.pathname.lastIndexOf('/')
  return loc.protocol + '//' + loc.hostname + loc.pathname.substring(0, index) + '/' + url
}

var determine_video_type = function(video_url) {
  var video_url_regex_pattern = /^.*\.(mp4|mp4v|mpv|m1v|m4v|mpg|mpg2|mpeg|xvid|webm|3gp|avi|mov|mkv|ogv|ogm|m3u8|mpd|ism(?:[vc]|\/manifest)?)(?:[\?#].*)?$/i
  var matches, file_ext, video_type

  matches = video_url_regex_pattern.exec(video_url)

  if (matches && matches.length)
    file_ext = matches[1]

  if (file_ext) {
    switch (file_ext) {
      case "mp4":
      case "mp4v":
      case "m4v":
        video_type = "video/mp4"
        break
      case "mpv":
        video_type = "video/MPV"
        break
      case "m1v":
      case "mpg":
      case "mpg2":
      case "mpeg":
        video_type = "video/mpeg"
        break
      case "xvid":
        video_type = "video/x-xvid"
        break
      case "webm":
        video_type = "video/webm"
        break
      case "3gp":
        video_type = "video/3gpp"
        break
      case "avi":
        video_type = "video/x-msvideo"
        break
      case "mov":
        video_type = "video/quicktime"
        break
      case "mkv":
        video_type = "video/x-mkv"
        break
      case "ogg":
      case "ogv":
      case "ogm":
        video_type = "video/ogg"
        break
      case "m3u8":
        video_type = "application/x-mpegURL"
        break
      case "mpd":
        video_type = "application/dash+xml"
        break
      case "ism":
      case "ism/manifest":
      case "ismv":
      case "ismc":
        video_type = "application/vnd.ms-sstr+xml"
        break
    }
  }

  return video_type || ""
}

var process_all_inline_script_tags = function(filter) {
  var scripts, source, result

  scripts = unsafeWindow.document.querySelectorAll('script:not([src])')

  for (var i=0; i < scripts.length; i++) {
    source = scripts[i].innerHTML
    source = source.replace(/[\t\r\n]+/g, ' ').trim()
    result = filter(source)

    if (result)
      return result
  }

  return null
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url, ignore_top_window) {
  url = resolve_url(url, /* allow_blank= */ true)
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      if (ignore_top_window) throw ''

      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  video_url = resolve_url(video_url)
  if (!video_url) return

  vtt_url = resolve_url(vtt_url)

  if (!referer_url)
    referer_url = unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    if (!video_type)
      video_type = determine_video_type(video_url)

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- bootstrap

var init = function() {
  if ((typeof GM_getUrl === 'function') && (GM_getUrl() !== unsafeWindow.location.href)) return

  tunnel_into_iframe() || process_packed_inline_scripts()
}

// ----------------------------------------------------------------------------- tunnel into iframe window

var tunnel_into_iframe = function() {
  var iframe_url, regex, matches

  iframe_url = get_iframe_url()

  if (iframe_url) {
    regex   = /^http.+[\?&]url=([^&]+).*$/
    matches = regex.exec(iframe_url)

    if (matches) {
      iframe_url = matches[1]
      iframe_url = atob(iframe_url)
      iframe_url = decodeURIComponent(iframe_url)
    }
  }

  if (iframe_url)
    redirect_to_url(iframe_url, /* ignore_top_window= */ true)

  return !!iframe_url
}

var get_iframe_url = function() {
  var iframe_url

  if (!iframe_url) {
    // check DOM for <iframe> element
    var iframe = unsafeWindow.document.querySelector('iframe[src][allowfullscreen="true"]')

    if (iframe)
      iframe_url = iframe.getAttribute('src')
  }

  return iframe_url
}

// ----------------------------------------------------------------------------- process p.a.c.k.e.d() scripts

// -------------------------------------
// data:

var filter_iframe_regex = {
  whitespace:   /[\r\n\t]+/g,
  redirect_url: /^.*="http[^"]+[\?&]url=([^"&]+)["&].*$/,
  video_url:    /(host_tmg|file_name|jdtk)\s*=\s*["']([^"']+)["']/g
}

// -------------------------------------
// state:

var filter_iframe_video_url_components = {}

// -------------------------------------

var process_packed_inline_scripts = function() {
  var video_url = process_all_inline_script_tags(filter_iframe)

  if (video_url && user_options.common.debug)
    console.log(video_url)

  if (video_url)
    process_video_url(video_url)

  return !!video_url
}

var filter_iframe = function(source) {
  var prefix, unpacked, matches, iframe_url, key, val, video_url

  prefix = 'eval(function(p,a,c,k,e,d){'

  if (source.substring(0, prefix.length) !== prefix) return null

  try {
    unpacked = $globals.eval(source.substring(4, source.length))

    if (user_options.common.debug)
      console.log(unpacked)

    unpacked = unpacked.replace(filter_iframe_regex.whitespace, ' ')

    matches = filter_iframe_regex.redirect_url.exec(unpacked)
    if (matches) {
      iframe_url = matches[1]
      iframe_url = atob(iframe_url)
      iframe_url = decodeURIComponent(iframe_url)

      redirect_to_url(iframe_url, /* ignore_top_window= */ true)
      return true
    }

    while (matches = filter_iframe_regex.video_url.exec(unpacked)) {
      key = matches[1]
      val = matches[2]

      filter_iframe_video_url_components[key] = val

      if (
        filter_iframe_video_url_components['host_tmg']  &&
        filter_iframe_video_url_components['file_name'] &&
        filter_iframe_video_url_components['jdtk']
      ) {
        video_url = [
          'https://',
          filter_iframe_video_url_components['host_tmg'],
          '/',
          filter_iframe_video_url_components['file_name'],
          '?token=',
          filter_iframe_video_url_components['jdtk']
        ]

        video_url = video_url.join('')
        return video_url
      }
    }
  }
  catch(e) {
    return null
  }
}

// -----------------------------------------------------------------------------

init()
