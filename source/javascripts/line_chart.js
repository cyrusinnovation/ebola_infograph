var LINE_CHART = {};
LINE_CHART.line_chart = function(data_file, chart_title, event_names, chart_name, override_height) {
  this.dates,
  this.override_height = override_height;
  this.timeFormat = d3.time.format("%Y-%m-%d"),
  this.axisFormat = d3.time.format("%m/%d"),
  this.focus = null,
  this.all_events = Event.events.get_events(event_names);
  this.chart_id = '#' + chart_name;

  this.calculate_dimensions = function() {
    this.margin = {top: 20, right: 30, bottom: 30, left: 40};
    this.calc_width = parseInt(d3.select(this.chart_id).style('width'));
    this.calc_height = this.override_height ? this.override_height : this.calc_width * 3 / 5;
    this.width = this.calc_width - this.margin.left - this.margin.right;
    this.height = this.calc_height - this.margin.top - this.margin.bottom;    
  }

  this.setup_voronoi = function() {
    this.x_scale
        .range([0, this.width]);

    this.y_scale
        .range([this.height, 0]);

    this.voronoi = d3.geom.voronoi()
        .x(function(d) { return Infograph.line_charts[chart_name].x_scale(d.date); })
        .y(function(d) { return Infograph.line_charts[chart_name].y_scale(d.value); })
        .clipExtent([[-this.margin.left, -this.margin.top], [this.width + this.margin.right, this.height + this.margin.bottom]]);

    this.line = d3.svg.line()
        .x(function(d) { return this.x_scale(d.date); })
        .y(function(d) { return this.y_scale(d.value); });    
  }

  var self = this;
  this.x_scale = d3.time.scale();
  this.y_scale = d3.scale.linear();
  this.calculate_dimensions();
  this.setup_voronoi();

  this.svg = d3.select(this.chart_id).append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .attr("class", "line_chart")
    .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

  this.mouseover = function(d) {
    d3.select(d.place.line).classed(d.place.hover_class(), true);
    d.place.line.parentNode.appendChild(d.place.line);
    this.focus.attr("transform", "translate(" + this.x_scale(d.date) + "," + this.y_scale(d.value) + ")");
    this.focus.select("text").text(d.place.name);
  }

  this.mouseout = function(d) {
    d3.select(d.place.line).classed(d.place.hover_class(), false);
    this.focus.attr("transform", "translate(-100,-100)");
  }

  this.clear_focus = function(d) {
    d3.selectAll('.united-states--hover').classed('united-states--hover', false);
    d3.selectAll('.place--hover').classed('place--hover', false);
    this.focus.attr("transform", "translate(-100,-100)");
  }

  this.event_dates = function() {
    var self = this;
    return this.all_events.map(function(e) { return self.timeFormat.parse(e.date); })
  }

  this.setup_x_axis = function(x) {
    var self = this;
    this.x_axis = this.svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + this.height + ")");

    this.x_axis
      .call(d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(8)
        .tickFormat(function(d) { return self.axisFormat(d) }));
  }

  this.setup_events_axis = function(x, height) {
    if (this.all_events.length <= 0) {
      return;
    }

    var self = this;
    axis_event_dates = this.event_dates();

    event_axis = d3.svg.axis()
      .orient('top')
      .scale(x)
      .tickSize(height)
      .tickValues(axis_event_dates)
      .tickFormat(function(d) { return self.event_for(d); });

    hitbox_axis = d3.svg.axis()
      .orient('top')
      .scale(x)
      .tickSize(height)
      .tickValues(axis_event_dates)
      .tickFormat(function(d) { return ''; });

    this.event_g = this.svg.append('g');
    this.event_g
      .attr('class', 'axis--event')
      .attr("transform", "translate(0," + this.height + ")")
      .call(event_axis)
      .selectAll('text')
      .attr('y', -4)
      .attr('x', 6)
      .attr('transform', 'rotate(-90)')
      .style("text-anchor", 'start');

    this.hitbox_g = this.svg.append('g');
    this.hitbox_g
      .attr('class', 'event--hitbox')
      .attr("transform", "translate(0," + this.height + ")")
      .call(hitbox_axis)
      .selectAll('line')
      .on('mouseover', function(d) { self.event_mouseover(d); })
      .on('mouseout', function(d) { self.event_mouseout(d); })
  }

  this.event_mouseover = function(date) {
    d3.selectAll('.axis--event text')
      .transition()
      .duration(250)
      .style('opacity', function(d) { 
        return (date.getTime() == d.getTime()) ? '1' :'0'; 
      });
  }

  this.event_mouseout = function(d) {
    d3.selectAll('.axis--event text')
      .transition()
      .duration(250)
      .style('opacity', '0');
  }

  this.event_for = function(event_date) {
    date = this.timeFormat(event_date)
    event_text = '';
    this.all_events.forEach(function(e) {
      if (e.date == date) {
        event_text = e.description;
        return;
      }
    });

    return event_text;
  }    

  this.build_chart = function(error, places) {
    var self = this;
    this.x_scale.domain(d3.extent(this.dates));
    this.y_scale.domain([0, d3.max(places, function(c) { return d3.max(c.values, function(d) { return d.value; }); })]).nice();

    this.setup_x_axis(this.x_scale);
    this.y_axis = this.svg.append("g")
        .attr("class", "axis axis--y")

    this.y_axis
        .call(d3.svg.axis()
          .scale(this.y_scale)
          .orient("left"))
      .append("text")
        .attr("x", 4)
        .attr("dy", ".32em")
        .style("font-weight", "bold")
        .text(chart_title);

    this.place_lines = this.svg.append("g");
    this.place_lines
      .selectAll("path")
        .data(places)
      .enter().append("path")
        .attr("d", function(d) { d.line = this; return self.line(d.values); })
        .attr("class", function(d) { return d.place_class(); });

    this.focus = this.svg.append("g")
        .attr("transform", "translate(-100,-100)")
        .attr("class", "focus");

    this.focus.append("circle")
        .attr("r", 3.5);

    this.focus.append("text")
        .attr("y", -10);

    this.voronoiGroup = this.svg.append("g")
        .attr("class", "voronoi");

    this.voronoiGroup.selectAll("path")
        .data(this.voronoi(d3.nest()
            .key(function(d) { return self.x_scale(d.date) + "," + self.y_scale(d.value); })
            .rollup(function(v) { return v[0]; })
            .entries(d3.merge(places.map(function(d) { return d.values; })))
            .map(function(d) { return d.values; })))
      .enter().append("path")
        .attr("d", function(d) { 
          return "M" + d.join("L") + "Z"; 
        })
        .datum(function(d) { return d.point; })
        .on("mouseover", function(d) { self.mouseover(d); })
        .on("mouseout", function(d) { self.mouseout(d); });

    this.setup_events_axis(this.x_scale, this.height - 7);
  }

  this.type = function(d, i) {
    var self = this;
    if (!i) this.dates = Object.keys(d).map(self.timeFormat.parse).filter(Number);
    var place = {
      name: d.Name,
      values: null,

      is_united_states: function() {
        return this.name == 'United States';
      },
      place_class: function() {
        if (this.is_united_states()) { return 'united-states'; }
        return 'places';
      },
      hover_class: function() {
        if (this.is_united_states()) { return 'united-states--hover'; }
        return 'place--hover';
      }      
    };
    place.values = this.dates.map(function(place_date) {
      return {
        place: place,
        date: place_date,
        value: parseFloat(d[self.timeFormat(place_date)])
      };
    });

    return place;
  }

  this.resize = function() {
    var self = this;
    this.calculate_dimensions();
    this.setup_voronoi();

    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
    .select("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.x_axis
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.svg.axis()
        .scale(this.x_scale)
        .orient("bottom")
        .ticks(8)
        .tickFormat(function(d) { return self.axisFormat(d) }));

    this.y_axis
        .call(d3.svg.axis()
          .scale(this.y_scale)
          .orient("left"))

    this.clear_focus();
    this.place_lines
      .selectAll("path")
      .attr("d", function(d) { return self.line(d.values); })        

    this.event_g
      .attr("transform", "translate(0," + this.height + ")")
      .call(event_axis)
      .selectAll('text')
      .attr('y', -4)
      .attr('x', 6)
      .attr('transform', 'rotate(-90)')
      .style("text-anchor", 'start');

    this.hitbox_g
      .attr("transform", "translate(0," + this.height + ")")
      .call(hitbox_axis)
  }

  Infograph.line_charts[chart_name] = this;

  d3.csv("data/" + data_file, 
    function(d, i) { return self.type(d, i); },
    function(error, places) { 
      self.build_chart(error, places); 
    });
  d3.select(window).on('resize.' + chart_name, function() { Infograph.line_charts[chart_name].resize(); });
};
