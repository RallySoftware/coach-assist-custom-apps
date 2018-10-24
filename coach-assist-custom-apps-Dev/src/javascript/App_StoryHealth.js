Ext.define('StoryHealthIndicator', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function () {
        var panel = Ext.create('Ext.panel.Panel', {
            layout: 'vbox',
            itemId: 'parentPanel',
            componentCls: 'panel',
            border: false,
            bodyBorder: false,
            items: [
                {
                    xtype: 'panel',
                    title: '<span class="mainHeader"><b>Choose Iteration</b></span>',
                    width: 1000,
                    itemId: 'subchildPanel1',
                    margin: '10 10 10 10',
                    border: false,
                    bodyBorder: false,
                    items:
                        [{
                            xtype: 'rallyiterationcombobox',
                            itemId: 'iterations',
                            listeners: {
                                change: this._onIterationComboboxChanged,
                                scope: this
                            }
                        }]
                },
                {
                    xtype: 'panel',
                    title: '<span class="storydata"><b>Stories Consolidated View</b></span>',
                    width: 1000,
                    itemId: 'subchildPanel2',
                    margin: '10 10 10 10',
                    hidden: true
                }
            ],
        });

        this.add(panel);
    },
    _onIterationComboboxChanged: function (obj) {
        var filter = obj.getQueryFromSelected();
        this.down('#subchildPanel1').remove(this.down('#summaryContent1'));
        this.down('#subchildPanel1').remove(this.down('#NoContent'));
        this.down('#subchildPanel2').hide();
        this.down('#subchildPanel2').removeAll();
        this._getStoryData(filter);
    },
    _getStoryData(filterObj) {
        Ext.create('Rally.data.wsapi.Store', {
            model: 'UserStory',
            autoLoad: true,
            enableHierarchy: true,
            listeners: {
                load: this._onStoriesLoaded,
                scope: this
            },
            filters: filterObj,
            fetch: ['Name', 'FormattedID', 'Description', 'Owner', 'Parent', 'Iteration', 'Release', 'RevisionHistory', 'Revisions']
        });

    },
    _onStoriesLoaded: function (store, stories) {
        this.globalStories = stories;
        var story;
        this.objNLP = [];
        this.NLPScore = 0;
        debugger;
        if (this.globalStories.length === 0) {
            this.down('#subchildPanel1').add({
                id: 'NoContent',
                padding: 10,
                maxWidth: 700,
                maxHeight: 500,
                overflowX: 'auto',
                //overflowY: 'hidden',
                html: '<span class="spnnodata">No Data Present !<span>',
                border: false,
                bodyBorder: false,
            });
            return;
        }
        else {
            for (var i = 0; i <= this.globalStories.length - 1; i++) {
                story = this.globalStories[i];
                this.objNLP.push({ "ID": story.get('ObjectID'), "DESCRIPTION": story.data.Description, "Name": story.data.Name, "FormattedID": story.data.FormattedID });
            }
            this._getNLPData();
            //this._processRevisions();
        }
    },
    _getNLPData: function () {
        debugger;
        var url = 'https://gogan02-dev3663:8080/health';
        var that = this;
        Ext.Ajax.request({
            url: url,
            method: "POST",
            scope: this,
            jsonData: JSON.stringify(this.objNLP),
            success: function (response) {
                //debugger;
                var respObj = JSON.parse(response.responseText).data;
                var healthyObj = respObj.filter(function (el) {
                    return el.HEALTH == "Good";
                });
                that.NLPScore = healthyObj.length / respObj.length * 100;
                that.NLPStories = healthyObj;

                that._processRevisions();
            },
            failure: function () {
                that._processRevisions();
            }
        });
    },
    _processRevisions: function () {
        var that = this;
        this.scoreGenerated = false;
        this.ajaxcallCounter = 0;
        var story;
        for (var i = 0; i <= this.globalStories.length - 1; i++) {
            story = this.globalStories[i];
            if (story && story.get('RevisionHistory') && story.get('RevisionHistory').Revisions) {
                var object = story.get('RevisionHistory').Revisions._ref;
                that._getRevisions(i, object);
            }
        }

    },
    _getRevisions: function (index, revObj) {
        var ur = 'https://rally1.rallydev.com/slm/webservice/v2.0' + revObj;
        var estindex = 0;
        var taskestindex = 0;
        var descindex = 0;
        var compareThreshold = 5;
        var planEstString = "PLAN ESTIMATE changed";
        var taskEstString = "TASK ESTIMATE TOTAL changed";
        var descString = "DESCRIPTION changed";
        var healthflag = true;

        Ext.Ajax.request({
            url: ur,
            method: "GET",
            scope: this,
            success: function (response) {
                var respObj = JSON.parse(response.responseText).QueryResult.Results;
                Ext.Array.each(respObj, function (obj) {
                    if (obj.Description.toString().startsWith(planEstString)) {
                        estindex += 1;
                    }
                    if (obj.Description.toString().startsWith(taskEstString)) {
                        taskestindex += 1;
                    }
                    if (obj.Description.toString().startsWith(descString)) {
                        descindex += 1;
                    }
                });

                if (estindex > compareThreshold || descindex > compareThreshold || taskestindex > 8) {
                    healthflag = false;
                }

                this.globalStories[index].data.HealthStatusRevisions = healthflag;
                this.ajaxcallCounter += 1;

                if (this.ajaxcallCounter > this.globalStories.length - 1) {
                    this._allrecordsProcessed(1, this.ajaxcallCounter, this.globalStories.length);
                }

            },
            failure: function () {
                this.ajaxcallCounter += 1;
                console.log('JSON REST API request failed');
                if (this.ajaxcallCounter > this.globalStories.length - 1) {
                    this._allrecordsProcessed(2, this.ajaxcallCounter, this.globalStories.length);
                }
            }
        });
    },
    _allrecordsProcessed: function (inded, callno, stcnt) {
        console.log("issue no" + inded)
        console.log("callno no" + callno)
        console.log("cnt story" + stcnt)
        if (!this.scoreGenerated) {
            this._generateScoreSummary();
        }
    },
    _generateScoreSummary: function () {
        var that = this;
        var storyData = this.globalStories;
        var revisionCounter = 0;
        var keyDataCounter = 0;
        var totalRecords = storyData.length;
        this.scoreGenerated = true;

        var records = _.map(storyData, function (record) {
            var healthRevision = true;
            var healthKeyData = true;
            if (record.get('HealthStatusRevisions') !== undefined && record.get('HealthStatusRevisions') === false) {
                healthRevision = false;
                revisionCounter += 1;
            }
            // If 2 out of 4 key fileds are not captured,increase counter
            //debugger;
            if (Number(record.get('Parent') === null) + Number(record.get('Iteration') === null) + Number(record.get('Release') === null) + Number(record.get('Owner') === null) > 2) {
                healthKeyData = false;
                keyDataCounter += 1;
            }

            return Ext.apply({
                RevisionHealth: healthRevision,
                KeydtHealth: healthKeyData
            }, record.getData());
        });

        var RevisonScore = ((revisionCounter) / totalRecords) * 100;
        var keyDataScore = ((keyDataCounter) / totalRecords) * 100;
        var overallScore = (that.NLPScore + (100 - RevisonScore) + (100 - keyDataScore)) / 3;


        var htmlOverAllSumamry = '<div id="summarystatus"><ul class="summarystatus">' +
            '<li> <span class="summarystatus_title" style="    color: black;">Overall Story Health is : <div class="divvalflex divhealthvalue" id="divoverall"></span> <span class="summarystatus_val">' + overallScore.toFixed(2) + '%</span></div></li>' +
            '</ul></div>';
        var htmlSummary = '<ul class="status">' +
            '<li> <span class="summarystatus_title">Well defined user stories ( analyzed using NLP) : </span> <div class="divvalflex divhealthvalue" id="divNLP"><span class="summarystatus_val">' + that.NLPScore.toFixed(2) + '% </span></div></li>' +
            '</ul>';
        var htmlSummaryNote = '<ul class="status2">' +
            '<li> A good user story is atomic, unambiguous, provides specific business value and is well articulated with clear purpose, roles and acceptance criteria mentioned. We analysed stories using NLP techniques to look out for some patterns and identify certain keywords indicative of their quality. </li>' +
            '</ul>';
        var htmlRevisionParams = '<ul class="status">' +
            '<li> Stories with uncertanity : <div id="divuncertain" class="divhealthvalue"><span id="spnuncertain" class="status_value">' + RevisonScore.toFixed(2) + '%</span></div></li>' +
            '<li class="subtext">  Calculated based on revisions done to estimated effort </li>' +
            '<li class="subtext">  Considered stories that might have underwent siginificant change of scope based on revisions done to description </li>' +
            '</ul>';
        var htmlKeyDataParams = '<ul class="status">' +
            '<li> Userstories missing necessary details:  <div id="divkeydata" class="divvalflex divhealthvalue"><span class="status_value">' + keyDataScore.toFixed(2) + '%</span></div></li>' +
            '<li class="subtext">  Details like Owner/Parent/Release/Iteration captured </li>' +
            '</ul>';


        this.down('#subchildPanel1').add({
            id: 'summaryContent1',
            padding: 10,
            maxWidth: 700,
            maxHeight: 400,
            overflowX: 'auto',
            overflowY: 'auto',
            html: htmlOverAllSumamry + htmlSummary + htmlSummaryNote + htmlRevisionParams + htmlKeyDataParams,//'No project selected',
            border: false,
            bodyBorder: false,
        });

        this.scoreGenerated = true;

        var component;
        component = Ext.query("span", "divoverall");
        Ext.get(component[0]).on("click", function () {
            that._createStoryGrid(records, "ALL");
        });

        component = Ext.query("span", "divNLP");
        Ext.get(component[0]).on("click", function () {
            that._createStoryGrid(null, "NLP");
        });

        component = Ext.query("span", "divuncertain");
        Ext.get(component[0]).on("click", function () {
            that._createStoryGrid(records, "REVISIONS");
        });

        component = Ext.query("span", "divkeydata");
        Ext.get(component[0]).on("click", function () {
            that._createStoryGrid(records, "KEYDATA");
        });

    },
    _createStoryGrid: function (records, rendertype) {
        var datasource;
        var columns = [{ text: 'Story ID', dataIndex: 'FormattedID', flex: 1, }, { text: 'Name', dataIndex: 'Name', width: 400 }];
        var title;
        var code;
        var color;
        debugger;
        if (rendertype === "ALL") {
            datasource = records;
            title = "Stories Consolidated View";
            var additionalCols = [
                {
                    text: 'Minimal Revisions',
                    dataIndex: 'RevisionHealth',
                    renderer: function (value) {
                        //debugger;
                        if (value === false) {
                            code = "&#10008;";
                            color = "Red";
                        }
                        else {
                            code = "&#10004;";
                            color = "DarkGreen";
                        }
                        return "<span style='font-family: wingdings; padding-left:15px; font-size: 200%;color:" + color + "'>" + code + "</span>";
                    }
                },
                {
                    text: 'Key Data Captured?',
                    dataIndex: 'KeydtHealth',
                    renderer: function (value) {
                        if (value === false) {
                            code = "&#10008;";
                            color = "Red";
                        }
                        else {
                            code = "&#10004;";
                            color = "DarkGreen";
                        }
                        return "<span style='font-family: wingdings; padding-left:15px;font-size: 200%;color:" + color + "'>" + code + "</span>";
                    }
                }];
            columns = columns.concat(additionalCols);
        }
        else if (rendertype === "REVISIONS") {
            title = "Stories with uncertanity";
            datasource = _.filter(this.globalStories, function (story) {
                return story.data["HealthStatusRevisions"] === false;
            });
        }
        else if (rendertype === "KEYDATA") {
            title = "Stories missing necessary details";
            datasource = _.filter(this.globalStories, function (story) {
                return (Number(story.data['Parent'] === null) + Number(story.data['Iteration'] === null) + Number(story.data['Release'] === null) + Number(story.data['Owner'] === null) > 2);
            });
        }
        else if (rendertype === "NLP") {
            title = "Stories well defined";
            datasource = this.NLPStories;
        }

        var summarygrid = Ext.create('Rally.ui.grid.Grid', {
            id: 'summarygrid',
            store: Ext.create('Rally.data.custom.Store', {
                data: datasource,
            }),
            context: this.getContext(),
            cls: 'customGridHeader',
            columnCfgs: columns,
            height: 400,
        });
        this.down('#subchildPanel2').show();
        this.down('#subchildPanel2').removeAll();
        this.down('#subchildPanel2').setTitle("<span class='storydata'><b>" + title + "</b></span>");
        this.down('#subchildPanel2').add(summarygrid);

    }

});

Rally.launchApp('StoryHealthIndicator', {
    name: 'Story Health Indicator'
});
