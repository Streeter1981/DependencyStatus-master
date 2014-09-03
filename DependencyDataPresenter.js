//Object to display iteration and user story
//dependency data returned from the DependencyDataService
function DependencyDataPresenter(displayElementName) {
    dojo.require("dojo.date.stamp");
    var that = this;
    var displayElement = dojo.byId(displayElementName);

    //Public method to display iteration and user story dependency data
    this.populateView = function(dependencyData) {
        if (dependencyData.length > 0) {
            displayElement.innerHTML += '<div id="subtitle">What is <span id="project-name">' +
                    dependencyData[0].Project.Name +
                    '</span> waiting for, and from whom?</div><div id="iteration-box"></div>';

            //Display each iteration returned
            for (var i = 0; i < dependencyData.length; i++) {
                displayIteration(dojo.byId("iteration-box"), dependencyData[i]);
            }
        } else {
            displayElement.innerHTML += '<div id="subtitle">No iterations found.</div>';
        }

    };

    //Function to handle query errors
    this.displayError = function(error) {
        var errorHtml = '<div class="queryError">' +
                error.message + '<ul>';
        for (var i = 0; i < error.errors.length; i++) {
            errorHtml += '<li>' + error.errors[i] + '</li>';
        }
        displayElement.innerHTML += errorHtml + '</ul></div>';
    };

    //Private helper function to format
    //an ISO date into M/D
    function formatDate(dateString) {
        //KRM - strip off the Z so dojo doesn't do
        //auto time zone stuff
        var date = parseDate(dateString);
        return (date.getMonth() + 1) + "/" + date.getDate();
    }

    function parseDate(dateString) {
        return dojo.date.stamp.fromISOString(dateString.replace(/Z/, ""));
    }

    //Private helper function to display the
    //specified iteration in the specified element.
    function displayIteration(displayElement, iteration) {
        //KRM - A note on the iteration status link:
        //This is currently supported as of this writing but may go away in the future.
        displayElement.innerHTML += '<div class="d-iteration" id="iteration' + iteration.ObjectID +
                '"><div class="heading"><span class="label"><a target="_top" href="/slm/rally.sp?pp=pj%2fd%2fis&iterationKey=' +
                iteration.ObjectID + '">' + iteration.Name + '</a></span><br/>' +
                formatDate(iteration.StartDate) + ' - ' + formatDate(iteration.EndDate) +
                ' (' + iteration.State + ')</div></div>';
        var dependencyDiv = dojo.byId("iteration" + iteration.ObjectID);
        var dependenciesFound = false;
        for (var i = 0; i < iteration.userStories.length; i++) {
            var userStory = iteration.userStories[i];
            if (that.displayDependencies(dependencyDiv, userStory)) {
                dependenciesFound = true;
            }
        }

        if (!dependenciesFound) {
            dependencyDiv.innerHTML += '<div class="dependency">No dependencies.</div>';
        }
    }

    //Public function to display the
    //specified user story and its dependencies in the specified element
    this.displayDependencies = function(displayElement, userStory) {
        if (userStory.Predecessors.length > 0) {
            displayElement.innerHTML += '<div class="dependency" id="userStory' + userStory.ObjectID +
                    '">' + that.createArtifactLink(userStory) + '<br/></div>';
            var userStoryDiv = dojo.byId("userStory" + userStory.ObjectID);

            //Display each dependency
            for (var i = 0; i < userStory.Predecessors.length; i++) {
                that.displayDependency(userStoryDiv, userStory,
                        userStory.Predecessors[i]);
            }

            return true;
        }

        return false;
    };

    //Public function to display the specified predecessor
    //in the specified displayDependency
    this.displayDependency = function(displayElement, userStory, predecessor) {
        var predecessorHtml = '<div class="predecessor-container"><div class="predecessor-status"><div class="state-legend' +
                (predecessor.Blocked ? "-blocked" : "") + '" title="' + predecessor.ScheduleState + '">' +
                getStateAbbreviation(predecessor.ScheduleState) +
                '</div></div><div class="predecessor">Waiting on <b>' + predecessor.Project.Name +
                '</b> for <br/>' + that.createArtifactLink(predecessor) + '<br/><span class="statusDescription">';
        var warningImageHtml = '<img src="/slm/images/icon_alert_sm.gif" alt="Warning" title="Warning" /> ';

        //Display the status of the predecessor
        if (predecessor.Iteration === null) {
            predecessorHtml += warningImageHtml + "Not yet scheduled";
        } else if (predecessor.ScheduleState == "Accepted") {
            predecessorHtml += "Accepted in " + predecessor.Iteration.Name +
                    " for " + formatDate(predecessor.Iteration.EndDate);
        } else if (predecessor.Blocked) {
            predecessorHtml += warningImageHtml + "Blocked";
        } else if (
        //KRM - Allow not late if same iteration?
        //predecessor.Iteration._ref !== userStory.Iteration._ref &&
                parseDate(predecessor.Iteration.EndDate) >
                        parseDate(userStory.Iteration.StartDate)) {
            predecessorHtml += warningImageHtml + "Scheduled for " +
                    formatDate(predecessor.Iteration.EndDate) + " - too late";
        } else {
            predecessorHtml += "Scheduled for " + formatDate(predecessor.Iteration.EndDate);
        }

        displayElement.innerHTML += predecessorHtml + '</span></div></div>';
    };

    //Public function to create a link for
    //the specified artifact
    this.createArtifactLink = function(artifact) {
        return '<a href="/slm/detail/' +
                (artifact._type === "HierarchicalRequirement" ? 'ar/' : 'df/') +
                artifact.ObjectID + '" target="_top">' + artifact.FormattedID + ': ' +
                artifact.Name + '</a>';
    };

    //Private helper function to get the abbreviation
    //for the specified user story state
    function getStateAbbreviation(state) {
        return state == "In-Progress" ? "P" : state.charAt(0);
    }

    return that;
}