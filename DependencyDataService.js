//Object to retrieve iteration and
//user story dependency data
function DependencyDataService() {
    var onBeforeUserStoryQuery = [];
    var onError = [];
    var onDataRetrievalComplete;

    var that = this;
    var rallyDataSource = new rally.sdk.data.RallyDataSource('__WORKSPACE_OID__', '__PROJECT_OID__',
            '__PROJECT_SCOPING_UP__', '__PROJECT_SCOPING_DOWN__');

    //Public method to retrieve data
    //Upon successful retrieval onCompletedCallback will be invoked
    //passing the results
    this.retrieveData = function (onCompletedCallback) {

        //Save for later
        onDataRetrievalComplete = onCompletedCallback;

        //KRM - Query improvement?
        //If iterations are never set to completed there may be
        //a very large # of results.  Consider adding the following...
        //AND (EndDate > Today) 
        var query = {
            key : "iterations",
            type : "iteration",
            fetch : "ObjectID,StartDate,EndDate,State,Name,Project",
            projectScopeUp : false,
            projectScopeDown: false,
            query : "(State != Accepted)",
            order : "StartDate"
        };

        //Run the query
        that.performQuery(query, retrieveDependencyData);

    };

    //Public method to
    //add a handler for an event triggered
    //before the main query is run
    //Signature should be: function handler(iterations) {}
    this.addOnBeforeUserStoryQueryHandler = function(handler) {
        onBeforeUserStoryQuery.push(handler);
    };

    //Public method to
    //add a handler for an event triggered
    //when a query error occurs
    //Signature should be: function handler(error) {}
    this.addOnErrorHandler = function(handler) {
        onError.push(handler);
    };

    //Public method to perform a query
    //Provides error handling
    this.performQuery = function(queries, callback) {
        rallyDataSource.findAll(queries, function(results) {

            //Check for errors
            var errors = [];
            for (var error in results.errors) {
                if (results.errors.hasOwnProperty(error)) {
                    for (var i = 0; i < results.errors[error].length; i++) {
                        errors.push(results.errors[error][i]);
                    }
                }
            }

            //No errors- perform callback with results
            if (errors.length === 0) {
                callback(results);
            } else {
                //An error occurred.
                //Invoke handlers
                var e = new Error("Error retrieving data.");
                error.errors = errors;
                for (var j = 0; j < onError.length; j++) {
                    onError[j](error);
                }
            }

        });
    };

    //Private helper method used as a callback for retrieveData
    //that retrieves user story information once the iteration
    //information has been returned
    function retrieveDependencyData(iterationResults) {
        //Create the collection to be returned
        var iterationInfo = [];

        //Create a series of queries to find the
        //user story info for each iteration
        var queries = [];
        for (var i = 0; i < iterationResults.iterations.length; i++) {
            queries.push(
                    {
                        key : iterationResults.iterations[i].ObjectID + "UserStories",
                        type : "hierarchicalrequirement",
                        fetch : "Predecessors,ScheduleState,Blocked,FormattedID,Project,Name,ObjectID,Iteration,StartDate,EndDate",
                        query : "(Iteration = " + iterationResults.iterations[i]._ref + " )"
                    });
            iterationInfo.push(iterationResults.iterations[i]);
        }

        //Execute the onBeforeQuery handlers
        for (i = 0; i < onBeforeUserStoryQuery.length; i++) {
            onBeforeUserStoryQuery[i](iterationInfo, queries);
        }

        that.performQuery(queries, function(results) {
            for (var i = 0; i < iterationInfo.length; i++) {
                iterationInfo[i].userStories = results[iterationInfo[i].ObjectID + "UserStories"];
            }

            onDataRetrievalComplete(iterationInfo);
        });
    }

    return that;
}