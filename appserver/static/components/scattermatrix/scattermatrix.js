// Scatterplot Matrix D3.js code taken and modified from http://bl.blocks.org/mbostock/4063663

define(function(require, exports, module) {
    var d3 = require("../d3/d3");
    var SimpleSplunkView = require("splunkjs/mvc/simplesplunkview");
    var _ = require("underscore");
    require("css!./scattermatrix.css");

    var ScatterMatrix= SimpleSplunkView.extend({
        className: "splunk-toolkit-scatter-matrix",
        options: {
            "managerid": null,
            "data": "preview",
            "height": 400,
            "colors": [],
            "groupByField": "" 
        },
        output_mode: "json",
        initialize: function() {
            SimpleSplunkView.prototype.initialize.apply(this, arguments);

            $(window).resize(this, _.debounce(this._handleResize, 20));
        },
        _handleResize: function(e) {
            // e.data is the this pointer passed to the callback.
            // here it refers to this object and we call render()
            e.data.render();
        },
        createView: function() {
            // Clearing 'waiting for data...'
            this.$el.html("");
            return true;
        },

        // Making the data look how we want it to for updateView to do its job
        formatData: function(data) {
           return data;
        },       
        updateView: function(viz, data) {
            var that = this;
           
            // mbostock used species as the field that is grouped (colored)
            // we'll just pass a value from options
            var species = this.settings.get("groupByField"); 
            var height = parseInt(this.settings.get("height"));
            var width = height;

            var colors = this.settings.get("colors"); 
            var color =  d3.scale.category10();
            if (colors.length > 0){
              color = d3.scale.ordinal().range(colors);
            }
            
            var size = 150,
                padding = 20;

            var x = d3.scale.linear()
                .range([padding / 2, size - padding / 2]);

            var y = d3.scale.linear()
                .range([size - padding / 2, padding / 2]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .ticks(5);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .ticks(5);

            var domainByTrait = {},
                traits = d3.keys(data[0]).filter(function(d) { return d !== species; }),
                n = traits.length;

            traits.forEach(function(trait) {
              domainByTrait[trait] = d3.extent(data, function(d) { return d[trait]; });
            });

            xAxis.tickSize(size * n);
            yAxis.tickSize(-size * n);

            var brush = d3.svg.brush()
                .x(x)
                .y(y)
                .on("brushstart", brushstart)
                .on("brush", brushmove)
                .on("brushend", brushend);

            var svg = d3.select(this.el).append("svg")
                .attr("width", size * n + padding)
                .attr("height", size * n + padding)
              .append("g")
                .attr("transform", "translate(" + padding + "," + padding / 2 + ")");

            svg.selectAll(".x.axis")
                .data(traits)
              .enter().append("g")
                .attr("class", "x axis")
                .attr("transform", function(d, i) { return "translate(" + (n - i - 1) * size + ",0)"; })
                .each(function(d) { x.domain(domainByTrait[d]); d3.select(this).call(xAxis); });

            svg.selectAll(".y.axis")
                .data(traits)
              .enter().append("g")
                .attr("class", "y axis")
                .attr("transform", function(d, i) { return "translate(0," + i * size + ")"; })
                .each(function(d) { y.domain(domainByTrait[d]); d3.select(this).call(yAxis); });

            var cell = svg.selectAll(".cell")
                .data(cross(traits, traits))
              .enter().append("g")
                .attr("class", "cell")
                .attr("transform", function(d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
                .each(plot);

            // Titles for the diagonal.
            cell.filter(function(d) { return d.i === d.j; }).append("text")
                .attr("x", padding)
                .attr("y", padding)
                .attr("dy", ".71em")
                .text(function(d) { return d.x; });

            cell.call(brush);

            function plot(p) {
              var cell = d3.select(this);

              x.domain(domainByTrait[p.x]);
              y.domain(domainByTrait[p.y]);

              cell.append("rect")
                  .attr("class", "frame")
                  .attr("x", padding / 2)
                  .attr("y", padding / 2)
                  .attr("width", size - padding)
                  .attr("height", size - padding);

              cell.selectAll("circle")
                  .data(data)
                .enter().append("circle")
                  .attr("cx", function(d) { return x(d[p.x]); })
                  .attr("cy", function(d) { return y(d[p.y]); })
                  .attr("r", 3)
                  .style("fill", function(d) { return color(d[species]); });
            }

            var brushCell;

            // Clear the previously-active brush, if any.
            function brushstart(p) {
              if (brushCell !== this) {
                d3.select(brushCell).call(brush.clear());
                x.domain(domainByTrait[p.x]);
                y.domain(domainByTrait[p.y]);
                brushCell = this;
              }
            }

            // Highlight the selected circles.
            function brushmove(p) {
              var e = brush.extent();
              svg.selectAll("circle").classed("hidden", function(d) {
                return e[0][0] > d[p.x] || d[p.x] > e[1][0]
                    || e[0][1] > d[p.y] || d[p.y] > e[1][1];
              });
            }

            // If the brush is empty, select all circles.
            function brushend() {
              if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
            }

            function cross(a, b) {
              var c = [], n = a.length, m = b.length, i, j;
              for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
              return c;
            }

            d3.select(self.frameElement).style("height", size * n + padding + 20 + "px");

        }

    });
    return ScatterMatrix;
});
