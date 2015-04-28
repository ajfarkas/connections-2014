# connections-2014
d3 chord diagram of intra-company connections on long-term projects.

The diagram is sortable by employee location (there are offices in several cities) or name. The information is selectable by individual or by project. The data was scrubbed for anonymity.

### Individual
Click on a person's name or the section of circle next to their name for all of their connections to other employees.
-  The thickness of the chord between two people is determined by the number of projects they have in common. 
-  Hover over a chord to see the number of connections between two individuals, and a list of projects they have in common.
-  The projects the selected person is involved in are indicated in the list of projects, to the right side of the page.

### Project
Click on a project button on the right of the page to see all of the people working on that project. 
The `Clear All` button resets all the chords to `visible`.

## Notes
This was made with [d3.js](d3js.org). The SVG and page as a whole are responsive, but the page is made for large screens and not tablets or phones. This is mostly for efficiency (my client wasn't interested in displaying the visualization on small devices), but also due to the difficulty of being able to read this amount of data on a small screen. Likewise, it was more efficient to call the data from a `JSON` file than to write a script to access it from the server, both because it is only accessible internally and because the data does not get filtered.

This page is live on my [portfolio site](ajfarkas.com/connections2014)
