var graph;
var selectedNode;

$(function () {
  graph = new Graph("#canvas");
  graph.addNode('6');

  game = new Game("makeFormula", {6: 4, 1:4}, graph);
  game.update();

  initButtons()
  initAutocomplete()

  //graph.updateLiveFormula()

  tutorial = new Tutorial()
  tutorial.init()
});

function initButtons() {
  $('.add-atom').click(function(e) {
    var element = $(this).attr('data-element')
    if (selectedNode) {
      graph.addLinkedNode(element, selectedNode.id);
    } else if (graph._nodes.length == 0) {
      graph.addNode(element)
    }
  });

  $('#expand-menu').click(function(e) {
    if ($('#menu').width() < 200) {
      $('#menu').animate({width: '60%'}, { duration: 500, queue: false });
      $('#canvas').animate({width: '40%'}, { duration: 500, queue: false });
      $('svg').animate({width: '100%'}, { duration: 500, queue: false });
    } else {
      $('#menu').animate({width: '10%'}, { duration: 500, queue: false });
      $('#canvas').animate({width: '90%'}, { duration: 500, queue: false });
      $('svg').animate({width: '100%'}, { duration: 500, queue: false });
    }

    // $('#expand-menu').toggle(500)
  })

  $('.kill-selected').click(function(e) {
    if (selectedNode) { graph.removeNode(selectedNode.id); }
  })

  $('.clear').click(function(e) {
    graph.removeAllNodes()
  })

  $('.save-to-local').click(function(e) {
    graph.saveToLocal()
  })

  $('.load-from-local').click(function(e) {
    graph.loadFromLocal()
  })
  $('.stop-generation').click(function(e) {
    graph.stopGenerate()
  })

  $('.start-generation').click(function(e) {
    graph.startGenerate()
  })

}

function formulaString(formulob) {
  var output = ""
  _.each(formulob, function(key, val) {
    var symbol = elementsData[val].symbol
    output += symbol + "<sub>" + key +"</sub>"
  })
  return output
}

function Tutorial() {
  this.init = function() {
    this.state = window.localStorage['tutorialState'] || 1
    window.localStorage['tutorialState'] = this.state
    if (this.state !== 'done') {
      this.loadSlide(this.state)
    }
  }

  this.restart = function() {
    window.localStorage['tutorialState'] = 1
    this.init()
  }

  this.nextSlide = function() {
    this.state = parseInt(this.state) + 1
    this.loadSlide(this.state)
  }

  this.finish = function() {
    console.log('ending tutorial')
    window.localStorage['tutorialState'] = 'done';
    $('#lightbox').empty()
    $('#overlay').hide()
  }

  this.addButton = function() {
    if (this.state < this.slideImages.length) {
      $('#lightbox').append("<a id='next'><i class='fa fa-chevron-circle-right fa-4x'></i></a>")
      $('#lightbox a#next').click(function(e) { tutorial.nextSlide() })
    } else {
      $('#lightbox').append("<a id='finish'><i class='fa fa-chevron-circle-right fa-4x'></i></a>")
      $('#lightbox a#finish').click(function(e) {
        tutorial.finish();
      })
    }
  }

  this.loadSlide = function(num) {
    console.log('loading slide #' + num)
    var src = 'static/tutorial/' + this.slideImages[num - 1]
    if (src == undefined) {return null}
    var html = "<img src='" + src + "'/>"
    console.log(html)
    $('#overlay').show()
    $('#lightbox').html(html)
    // $('#lightbox').modal()
    this.addButton()
  }

  this.slideImages = [
    "AminoAcidsFinal.svg",
    "HandOnChemistryHandSomeWater.svg"
  ]
}

function Game(gameType, goal, graph) {
  this.gameType = gameType;
  this.goal = goal;
  this.graph = graph;

  this.currentFormula = function(){
    var formulob = {}
    _.each(this.graph._nodes, function(node) {
      if (formulob[node.atomicNumber]) {
        formulob[node.atomicNumber] += 1
      } else {
        formulob[node.atomicNumber] = 1
      }
    })
    return formulob;
  }

  this.compareFormula = function(formulaDict, other){
    return _.isEqual(formulaDict, other);
  }

  this.updateMakeFormula = function () {
    var current = this.currentFormula()
    $('#formula-goal').html(formulaString(this.goal)) // should be done only init?
    $('#formula-current').html(formulaString(current))
    if (this.compareFormula(current, this.goal)){alert('you win');}
  }

  this.update = function(){
    if (this.gameType == 'makeFormula'){
      this.updateMakeFormula();
    }
  }
}


function Graph(el) {

  this.saveToLocal = function() {
    var ob = {
      linkPairs: _.map(links, function(link) {
        return [link.source.id, link.target.id]
      }),
      nodes: _.map(nodes, function(node) {
        return {atomicNumber: node.atomicNumber, id: node.id}
      }),
      recording: this._recording
    }

    var stringed = JSON.stringify(ob)
    window.localStorage.setItem("savedMolecule", stringed)
  }

  this.undo = function() {
    // WIP
    step = this._recording.pop();
    var f_name = step.shift();

    var reverse_function_dict = {
      "addNode": "removeNode",
      "addLink": "removeLink",
      "removeNode": "addNode",
      "removeLink": "addLink"
    }
    var f_name = reverse_function_dict[reverse_function_dict]


    // oh dear
    args = JSON.stringify(step).slice(1, -1);

    eval("this." + f_name +"(" + args + ")");

  }

  this.loadFromLocal = function() {
    var get = window.localStorage["savedMolecule"]
    if (get) {
      this.loadJSON(get);
    }
  }

  // {nodes: [{atomicNumber: 6, id: 4}], linkPairs: [[4,5]]}
  this.loadJSON = function(json) {
    var ob = JSON.parse(json)
    if (ob.recording){
      this.fromRecording(ob.recording);
    } else {
      graph.updateToMolecule(ob.nodes, ob.linkPairs);
    }
  }

  this.fromRecording = function(recording){
    var that = this

    this.removeAllNodes();

    var i = 0;
    var next = function() {
      if (i < recording.length){

        var step = recording[i]
        var f_name = step.shift();
        // that[f_name](step); // need to unpack args
        // that[f_name].apply(undefined, step);  // can't push undefined

        // oh dear
        args = JSON.stringify(step).slice(1, -1);

        eval("that." + f_name +"(" + args + ")");
        setTimeout(next, 100);
        i++;
      } else {
        clearTimeout(timer)
      }
    }
    timer = setTimeout(next, 100);
  }

  this.startGenerate = function(){
    var that = this

    var next = function() {
      // TODO removal more likely when more atoms (and vice versa)

      var molecule_pool = [1, 6, 8]

      var nodes = that._nodes
      var links = that._links

      var free_nodes = _.filter(nodes, function(n){return n.free > 0;})

      var choices = [];
      if (nodes.length > 1) {choices.push("removeNode");}
      if (free_nodes.length > 0) {choices.push("addLinkedNode");}
      if (nodes.length == 0) {choices.push("addNode");}

      var choice = choices[Math.floor(Math.random() * choices.length)];
      var step = [choice]

      switch(choice) {
        case "addLinkedNode":
          step.push(molecule_pool[Math.floor(Math.random() * molecule_pool.length)]);
          step.push(free_nodes[Math.floor(Math.random() * free_nodes.length)].id);
          break;
        case "removeNode":
          step.push(nodes[Math.floor(Math.random() * nodes.length)].id);
          break;
        case "addNode":
          step.push(molecule_pool[Math.floor(Math.random() * molecule_pool.length)]);
          break;
        default:
          console.log(choice);
          console.log("ERROR unknown randomly chosen function");
          return null
      }

      var f_name = step.shift();
      // that[f_name](step); // need to unpack args
      // that[f_name].apply(undefined, step);  // can't push undefined

      // oh dear
      args = JSON.stringify(step).slice(1, -1);

      eval("that." + f_name +"(" + args + ")");
      timer = setTimeout(next, 250);
    }
    timer = setTimeout(next, 250);
  }

  this.stopGenerate = function(){
    clearTimeout(timer)
  }


  this.updateToMolecule = function(oldNodes, linkPairs) {
    var that = this
    this.removeAllNodes()
    _.each(oldNodes, function(node) {
      that.addNode(node.atomicNumber, node.id)
    })

    _.each(linkPairs, function(linkPair) {
      that.addLink(linkPair[0], linkPair[1], 1)
    })
  }

  this.addLinkedNode = function(letter, linkedId) {
    if (selectedNode == null) {
      console.log('WARNING: YOU MUST SELECT A NODE BITCH');
      return null;
    }

    var linkedNode = findNode(linkedId)
    if (linkedNode.free < 1) {
      console.log("WARNING: trying to add to full atom")
      return null
    }

    var newNode = this.addNode(letter)
    this.addLink(newNode.id, linkedId, 1)
  }

  this.addNode = function(atomicNumber, id) {
    if (_.find(nodes, function(node) { node.id == id })) {
      console.log("TRIED TO CREATE A NODE OF AN ID THAT ALREADY EXISTED");
      return null
    }

    // Awful HACK
    this._recording.push(["addNode", atomicNumber, id]);

    var atomRepr = getAtom(atomicNumber)
    atomRepr.id = id || nodes.length == 0 && 1 || _.max( nodes, function(node) {return node.id}).id + 1
    nodes.push(atomRepr)
    update();
    if (nodes.length == 1) {
      selectedNode = nodes[0]
      $('circle').attr('stroke', 'green');
    }
    return atomRepr
  };

  this.removeNode = function(id) {
    // Awful HACK
    this._recording.push(["removeNode", id]);

    nodes.splice(findNodeIndex(id), 1);
    this.removeLinksToId(id)
    update();
    // game.update();
  };

  this.removeLinksToId = function(id) {
    var i = 0;
    while (i < links.length) {
      link = links[i];
      if (link.target.id == id || link.source.id == id) {
        this.removeLink(link.target.id, link.source.id)
      } else i++;
    }
  }

  this.removeLink = function (id1, id2) {
    // Awful HACK
    this._recording.push(["removeLink", id1, id2]);

    var node1 = findNode(id1)
    var node2 = findNode(id2)
    for (var i = 0; i < links.length; i++) {
      link = links[i];
      if (link.source.id == id1 && link.target.id == id2 || link.source.id == id2 && link.target.id == id1) {
        links.splice(i, 1);
        break;
      }
    }
    if (node1) node1.free += 1;
    if (node2) node2.free += 1;
    update();
  };

  this.removeAllLinks = function () {
      // Awful HACK
      this._recording.push(["removeAllLinks"]);

      links.splice(0, links.length);
      update();
  };

  this.removeAllNodes = function () {
    // Awful HACK
    // TODO some cleverness to replay without clearning
    // this._recording.push(["removeAllNodes"]);

    this._recording = [];;

    this.removeAllLinks()
    nodes.splice(0, nodes.length);
    update();
    selectedNode = null;
  };

  this.addLink = function (sourceId, targetId, value) {
    // Awful HACK
    this._recording.push(["addLink", sourceId, targetId, value]);

    if (!value) {var value = 1;}

    var source = findNode(sourceId)
    var target = findNode(targetId)

    if (source.free < 1 || target.free < 1) {
      console.log("WARNING: trying to add to full atom (from .addLink)")
      return null
    }

    links.push({
      source: source,
      target: target,
      value: value
    });

    source.free -= 1
    target.free -= 1

    update();
  };

  var findNode = function (id) {
    return _.find(nodes, function(node) { return node.id == id})
  };

  var findNodeIndex = function (id) {
      for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].id == id) {
              return i;
          }
      };
  };

  // set up the D3 visualisation in the specified element
  var w = $('#canvas').width();
  var h = $('#canvas').height();

  var vis = d3.select(el)
      .append("svg:svg")
      .attr("width", w)
      .attr("height", h)
      .attr("id", "svg")
      .attr("pointer-events", "all")
      .attr("viewBox", "0 0 " + w + " " + h)
      .attr("perserveAspectRatio", "xMinYMid")
      .append('svg:g');

  var force = d3.layout.force()
       .linkDistance(120)
       .charge(-1500)
       .friction(0.3)

  var nodes = force.nodes();
  var links = force.links();
  this._nodes = force.nodes();
  this._links = force.links();
  this._recording = [];

  var update = function () {
    var link = vis.selectAll("line")
      .data(links, function (d) {
      return d.source.id + "-" + d.target.id;
    });

    link.enter().append("line")
      .attr("id", function (d) {
        return d.source.id + "-" + d.target.id;
      })
      .attr("class", "link");

    link.append("title")
      .text(function (d) {
        return d.value;
      });

    link.exit().remove();

    var node = vis.selectAll("g.node")
      .data(nodes, function (d) {
        return d.id;
      });

    var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .call(force.drag);

    nodeEnter.append("svg:circle")
      .attr("r", function(d) {
        return Math.pow(40 * d.size, 1/3);
      })
      .attr("fill", function(d) {
        return d3.scale.category20()(d.size);
      })
      .attr("id", function (d) {
        return "Node;" + d.id;
      })
      .attr("stroke", "black")
      .attr("class", "nodeStrokeClass")
      .attr("stroke-width",2)
      .on('click', function(d,i) {
        $('circle').attr('stroke', 'black');
        $(this).attr('stroke', 'green');
        selectedNode = d;
      });

    nodeEnter.append("svg:text")
      .attr("class", "textClass")
      .attr("dx", 15)
      .attr("dy", ".35em")
      .text(function (d) {
        return d.symbol;
      });

    node.exit().remove();

    force.on("tick", function () {
      link.attr("x1", function (d) {
        return d.source.x;
      })
      .attr("y1", function (d) {
        return d.source.y;
      })
      .attr("x2", function (d) {
        return d.target.x;
      })
      .attr("y2", function (d) {
        return d.target.y;
      });
      node.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    });

    // vis.selectAll("line").sort(function (a, b) {
    //   return -1
    // })

    // Restart the force layout.
    force.gravity(.05)
        .distance(50)
        .linkDistance(50)
        .size([w, h])
        .start();

    if ("game" in window){game.update();}
  };

  // Make it all go
  update();
}

function getAtom(atomicNumber) {
  var raw = elementsData[atomicNumber]
  return {
    free: raw['free_electrons'] || free_electrons(atomicNumber) || 8,
    atomicNumber: atomicNumber,
    symbol: raw['symbol'],
    size: atomicNumber * 5 + 10
  }
}

var free_electrons = function(atomSize){
  if (atomSize <= 2){
    return 2 - atomSize;
  } if (atomSize < 18){
    return ((2 - atomSize) % 8) + 8;
  }
}


//   force = d3.layout.force()
//     .size([500, 500])
//     .nodes([{atom:"C", size:12, electrons: 4, id: 1}])
//     .linkDistance(120)
//     .charge(-1500)
//     .friction(0.3)


// // function initForce(nodes, links) {
// //   force = d3.layout.force()
// //        .nodes(nodes)
// //        .links(links)
// //        .linkDistance(120)
// //        .charge(-1500)
// //        .friction(0.3)
// //        .gravity(0.1)
// //        .size([500,500])
// //        .start()

// ============ SECTION ===============

var molecule = function(atoms_in_molecule){
  // we expect a string e.g. 'CCCNHOOHHHHHH'
  var atoms = [];
  for (var i=0; i < atoms_in_molecule.length; i++){
    atoms.push(atom(atoms_in_molecule[i]))
  }
  return atoms;
}

var pairs_to_links = function(tups){
  var links = [];
  for (var i=0; i < tups.length; i++){
    links.push({"source":tups[i][0], "target":tups[i][1]});
  }
  return links;
}

// ================= END SECTION ===============


function initAutocomplete() {
  $('#molecule-search input').autocomplete({
    lookup: _.map(molecules, function(ob, name){ return {value: name, data: name}}),
    onSelect: function (suggestion) {
      $(this).attr('disabled', 'disabled')
      var moleculeData = molecules[suggestion.data]
      graph.updateToMolecule(moleculeData.nodes, moleculeData.linkPairs)
    },
    width: 350,
  });
}


// ================= OLD ===============

// var render_molecule = function(selector, molecule_repr, height, width){
//   height = height || 200
//   width = width || 200

//   var m = molecule_repr["molecule"]; // e.g. "HHO"
//   var p = molecule_repr["links"]; // e.g. [[0, 2], [1, 2]]

//   var w=width
//   var h=height
//   fill = d3.scale.category20()

//   nodes = molecule(m)
//   links = pairs_to_links(p)

//   // vis = d3.select(selector).append("svg")
//   //                          .attr("width", w)
//   //                          .attr("height", h),

//   // force = d3.layout.force()
//   //                  .nodes(nodes)
//   //                  .links(links)
//   //                  .charge(-1500)
//   //                  .friction(0.8)
//   //                  .gravity(0.5)
//   //                  .size([w,h])
//   //                  .start(),

//   link = vis.selectAll("line")
//             .data(links)
//             .enter()
//             .append("line")
//             .attr("class","link")

//   node = vis.selectAll(".node")
//             .data(nodes)
//             .enter()
//             .append("g")
//             .attr("class", "node")
//             .call(force.drag);

//   node.append("circle")
//       .attr("r", function(d) {
//         return Math.pow(40 * d.size, 1/3);
//       })
//       .attr("fill", function(d) {
//         return fill(d.size);
//       })
//       .attr("stroke", "black")
//       .attr("stroke-width",2);

//   node.append("text")
//       .attr("dx", function(d) {
//         return Math.pow(40 * d.size, 1/3) + 1;
//       })
//       .attr("dy", ".35em")
//       .text(function(d) {return d.atom;});

//   force.on("tick", function() {
//     link.attr("x1", function(d) { return d.source.x; })
//         .attr("y1", function(d) { return d.source.y; })
//         .attr("x2", function(d) { return d.target.x; })
//         .attr("y2", function(d) { return d.target.y; });

//     node.attr("transform", function(d) {
//       return "translate(" + d.x + "," + d.y + ")";
//     });
//   });
// }
