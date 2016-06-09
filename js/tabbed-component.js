Array.prototype.forEach.call(
  document.querySelectorAll('.tabbed-component'),
  // initializer per each component
  function (container) {
    var doc = container.ownerDocument;
    var sections = this.$(container, '[data-section]');
    var tabbedBar = container.appendChild(doc.createElement('ul'));
    var results = container.appendChild(doc.createElement('ol'));
    var cache = [];

    // promote as js content
    container.className += ' js';
    tabbedBar.className = 'bar';
    results.className = 'results';

    // clean up non js structure
    sections.forEach(function (section, i) {
      // I know I could've used bind but for the lsitener
      // but then Android 2.X wouldn't work.
      // The task target was mobile first but it didn't mention
      // which one was the base for mobile.
      var helper = this;
      var title = this.$(section, '.section-name:first');
      // not so clean but works well
      section.textContent = '';
      section.appendChild(title);
      tabbedBar.appendChild(section);
      section.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        helper.show(container, sections, results, cache, i);
      });
    }, this);

    // I know, too many arguments ... apologies
    // this blew up while coding
    // TODO: refactor using an instance/object intead of dozen args
    this.show(container, sections, results, cache, 0);
  },

  // very simple utility / helper
  {
    // api key to request sites
    apiKey: '9wur7sdh84azzazdt3ye54k4',
    // extra required fields
    fields: ['trailText'],
    // avoid too many requests (ms) uses the cache
    cleanAfter: 10000,

    // select nodes, all as Array or :first found
    $: function (parentNode, css) {
      return css.lastIndexOf(':first') === (css.length - 6) ?
        parentNode.querySelector(css.slice(0, -6)) :
        Array.prototype.slice.call(
          parentNode.querySelectorAll(css), 0
        );
    },

    // shows info once a tab is clicked
    show: function (container, sections, results, cache, currentTab) {
      var helper = this;
      var doc = container.ownerDocument;
      sections.forEach(function (section, i) {
        var shown = /\bshown\b/.test(section.className);
        // avoid double clicks or clicks to the same tab twice
        if (i === currentTab) {
          if (!shown) {
            results.textContent = '';
            section.className += ' shown';
            if (cache[i]) {
              // cloneNode to avoid losing fragment nodes once appended
              results.appendChild(cache[i].fragment.cloneNode(true));
            } else {
              var fragment = doc.createDocumentFragment();
              cache[i] = {
                fragment: fragment,
                // I like to have always a reference to eventually drop timers
                timer: setTimeout(
                  function () { cache[i] = null; },
                  helper.cleanAfter
                )
              };
              helper.fetch(container, section, function (info) {
                info.response.results.forEach(function (details) {
                  var li = doc.createElement('li');
                  var h3 = li.appendChild(doc.createElement('h3'));
                  var a = h3.appendChild(doc.createElement('a'));
                  h3.className = 'title';
                  a.textContent = details.webTitle;
                  a.href = details.webUrl;
                  helper.fields.forEach(function (fieldName) {
                    // apparently some news returns in HTML
                    // so that innerHTML becomes necessary
                    li.appendChild(
                      doc.createElement('p')
                    ).innerHTML = details.fields[fieldName];
                  });
                  fragment.appendChild(li);
                });
                results.appendChild(fragment.cloneNode(true));
              });
            }
          }
        } else if (shown) {
          section.className = section.className.replace(/\bshown\b/g, '');
        }
      });
    },

    // sanitize an url with parameters
    url: function (str, obj) {
      return str.replace(/\$\{(.+?)\}/g, function ($0, $1) {
        return encodeURIComponent(obj[$1]);
      });
    },

    // fetch remote content and invoke a callback once done
    fetch: function (container, section, then) {
      var xhr = window.XDomainRequest ?
        new XDomainRequest : new XMLHttpRequest();
      xhr.open(
        'GET',
        this.url(
          // ES6 template strings "friendly"
          'http://content.guardianapis.com/search?' + [
            'section=${section}',
            'page-size=${pageSize}',
            'show-fields=trailText',
            'api-key=${apiKey}'
          ].join('&'),
          {
            section: section.getAttribute('data-section'),
            pageSize: container.getAttribute('data-page-size'),
            showFields: this.fields.join(','),
            apiKey: this.apiKey
          }
        ),
        true
      );
      if ('onload' in xhr) {
        xhr.onload = function () {
          then(JSON.parse(xhr.responseText));
        };
      } else {
        // old fallback
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            // TODO: handle non 2XX-3XX cases
            then(JSON.parse(xhr.responseText));
          }
        };
      }
      xhr.send(null);
    }
  }
);