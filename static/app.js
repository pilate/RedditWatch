window.App = {
    'after':'',
    'settings': {
        'item_width':280
    }
};

App.loading = function () {
    App.status.html("Loading.");
    App.is_loading = true;
};

App.loaded = function () {
    App.status.html("Loaded.");
    App.is_loading = false;
};

// Routines for getting image URLs for different services
App.image_domains = {
    'i.imgur.com': function (article) {
        var url = article.data.url;
        var split_url = url.split("imgur.com/");
        if (split_url[1].indexOf(".") === -1) {
            return url + ".png";
        }
        return url;
    },
    'i.minus.com': function (article) {
        return article.data.url;
    },
    'imgur.com': function (article) {
        var url = article.data.url;
        
        // Ignore album images
        if (url.indexOf("/a/") !== -1) {
            return "";
        }

        // Remove unnecessary paths from image URLs
        url = url.replace(/(www\.)?imgur.com/, "i.imgur.com");
        url = url.replace(/\/r\/[^\/]+/, "");
        url = url.replace("/new", "");
        url = url.replace("/gallery", "");

        // Make sure the URL doesnt already have an extension
        var split_url = url.split("imgur.com/");
        if (split_url[1].indexOf(".") === -1) {
            url += ".png";
        }

        return url;
    }
};

App.get_images = function () {
    // Prevent more than one request at a time
    if (App.is_loading === true) {
        return;
    }
    App.loading();

    var url = "http://www.reddit.com/r/" + App.reddits + ".json";
    // Use JSONP to get reddit articles
    jQuery.ajax({
        'type': 'GET',
        'url': url,
        'dataType': 'jsonp',
        'jsonp': 'jsonp',
        'success': App.json_callback,
        'data': {
            'limit':100,
            'after':App.after
        }
    }); 
};

App.json_callback = function (reddit_json) {
    App.after = reddit_json.data.after;

    var articles = reddit_json.data.children;
    for (var i=0; i < articles.length; i++) {
        var article = articles[i];
        if (article.data.domain in App.image_domains) {
            var url = App.image_domains[article.data.domain](article);

            // Actual brick item
            var new_div = jQuery("<a>", {
                'class':'item',
                'href': article.data.url
            });

            // Displayed image
            var new_img = jQuery("<img>", {
                'src': url,
                'css': {
                    'width': App.settings.item_width + "px"
                }
            }).load(App.masonry_add);
            new_div.append(new_img)

            // Hover label
            var new_hover = jQuery("<p>", {
                'class': 'item_text'
            });
            new_div.append(new_hover);

            // Hover link
            var hover_link = jQuery("<a>", {
                'text': article.data.title,
                'href': 'http://www.reddit.com' + article.data.permalink
            });
            new_hover.append(hover_link);

            // Add new structure to loading container
            App.load_container.append(new_div);
        }
        else {
            try {
                console.log(article.data.domain, article.data.url);
            }
            catch (e) {}
        }
    }

    // Prevent instant requesting of the next page while images load
    setTimeout(App.loaded, 2000);
};

App.masonry_add = function (e) {
    // Move parent of image loaded into visible div
    var parent = jQuery(e.target.parentNode);
    App.container.append(parent);

    // Update masonry with new element
    App.container.masonry("appended", parent);
};

// Clear display and start over
App.reload = function () {
    jQuery("#container, #load_container").empty();
    App.container.masonry("reload");
};

App.change_reddits = function () {
    App.reddits = this.value;
    App.after = "";
    App.reload();
    App.get_images();
}

jQuery(function () {
    var jq_wind = jQuery(window);
    var header_input = jQuery("#header input");

    // Get more images if we're near the bottom of the page (100px)
    jq_wind.scroll(function() {
        if(jq_wind.scrollTop() + jq_wind.height() > jQuery(document).height() - 100) {
            App.get_images();
        }
    });

    // Cache repeatedly used elements/variables
    App.reddits = header_input.val() || header_input.attr("placeholder");
    App.container = jQuery("#container");
    App.load_container = jQuery("#load_container");
    App.status = jQuery("#status");

    // Init masonry
    App.container.masonry({
        'itemSelector': '.item',
        'columnWidth': App.settings.item_width,
        'gutterWidth': 10
    });

    header_input.attr("placeholder", App.reddits);
    header_input.change(App.change_reddits);

    // Get the first page of images
    App.get_images();
});