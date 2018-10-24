Ext.define('TeamHealthIndicator', {
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
                    title: '<span class="mainHeader"><b>CHOOSE ITERATION</b></span>',
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
                    //title: '<span class="storydata"><b>Team Members</b></span>',
                    width: 800,
                    itemId: 'subchildPanel2',
                    margin: '50 10 10 10',
                    cls: 'pnlsubdetails',
                    componentCls: 'pnlsubdetails',
                    border: false,
                    bodyBorder: false,
                    hidden: true,
                    html: '<div id="parentdiv" style="display:inline-flex"><div id="pchild1" style="display:none"><span class="subelementspan">CURRENT ITERATION</span><div id="child1" style="width:400px;padding: 10px;"></div></div><div id="pchild2" style="display:none"><span class="subelementspan">PREVIOUS ITERATION</span><div id="child2" style="width:400px;padding: 10px;"></div></div>'
                }
            ],
        });

        this.add(panel);
    },
    _onIterationComboboxChanged: function (obj) {
        //debugger;
        if (this._iterationObj === undefined) {
            this._iterationObj = obj.store.data.items;
        }
        this._startDate = Rally.util.DateTime.toIsoString(obj.getRecord().get('StartDate'));
        this._endDate = Rally.util.DateTime.toIsoString(obj.getRecord().get('EndDate'));
        console.log("Current Iteration is :" + obj.getRecord().get('Name'))
        for (var index = 0; index <= this._iterationObj.length - 1; index++) {
            var objIteration = this._iterationObj[index];
            if (obj.getRecord().get('StartDate') == objIteration.data['StartDate']) {
                if (this._iterationObj[index + 1] !== undefined) {
                    this.prevStartDate = Rally.util.DateTime.toIsoString(this._iterationObj[index + 1].data['StartDate']);
                    this.prevEndDate = Rally.util.DateTime.toIsoString(this._iterationObj[index + 1].data['EndDate']);
                    console.log("Prev Iteration is :" + this._iterationObj[index + 1].data['Name']);
                    break;
                }
            }
        }
        //Clean-up existing ui data
        this.down('#subchildPanel1').remove(this.down('#summaryContent1'));
        this.down('#subchildPanel1').remove(this.down('#NoContent'));
        this.down('#subchildPanel2').hide();
        this.down('#subchildPanel2').setTitle("");
        Ext.get("pchild1").setStyle("display", "none");
        Ext.get("pchild2").setStyle("display", "none");
        if (Ext.get("gridMemberschild1") !== null) {
            Ext.get("gridMemberschild1").destroy();
        }
        if (Ext.get("gridMemberschild2") !== null) {
            Ext.get("gridMemberschild2").destroy();
        }
        //Get records for selected iteration
        this._getSnapshotData(this._startDate, this._endDate);
    },
    _getSnapshotData: function (startDate, endDate) {
        //debugger;
        console.log(this.getContext().getProject().ObjectID);
        var that = this;
        var myStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            find: {
                _TypeHierarchy: { "$in": ["HierarchicalRequirement", "Defect"] },
                Project: this.getContext().getProject().ObjectID,
                CreationDate: { '$gt': this.prevStartDate, '$lt': this._endDate },
                ScheduleState: "In-Progress",
                Blocked: false
            },
            fetch: ['_ValidFrom', '_ValidTo', '_RevisionNumber', '_User', 'CreationDate'],
            sort: {
                _User: 1
            },
            limit: Infinity,
            removeUnauthorizedSnapshots: true,
            listeners: {
                load: function (store, records) {
                    console.log("loaded %i records", records.length);
                    if (records.length > 0) {
                        that._processData(records);
                    }
                    else {
                        debugger;
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
                },
                scope: this
            }
        });
    },
    _processData: function (snapshotObjAll) {
        this._userDetails = [];
        var recCnt = 0;
        var _currentUser;
        var _prevUser;
        this._activeMembers = [];
        this._userDetails = {};
        var that = this;
        debugger;
        console.log("total 2 iteration data records : " + snapshotObjAll.length);
        //sy code
        this.prevsnapshotObj = snapshotObjAll.filter(function (el) {
            return Date.parse(el.data.CreationDate) < Date.parse(that._startDate);
        });
        snapshotObj = snapshotObjAll.filter(function (el) {
            return Date.parse(el.data.CreationDate) >= Date.parse(that._startDate);
        });
        console.log("current iteration data records : " + snapshotObj.length);

        if (snapshotObj.length === 0) {
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

        that._generateinitialSummary();
        //sy code
        if (snapshotObj && snapshotObj.length > 0) {
            for (var index = 0; index <= snapshotObj.length - 1; index++) {
                //debugger;
                _snapshot = snapshotObj[index];
                if (_snapshot && _snapshot.get('_User')) {
                    _currentUser = _snapshot.get('_User');
                    if (this._userDetails[_currentUser] != undefined) {
                        var counter = this._userDetails[_currentUser] + 1;
                        this._userDetails[_currentUser] = counter;
                        //if (counter >= 5 && this._activeMembers.indexOf(_currentUser) === -1) {
                        //  this._activeMembers.push(_currentUser);
                        //}
                    }
                    else {
                        this._userDetails[_currentUser] = 1;
                    }

                }
            }
            //this._generateScoreSummary();
        }
        //fetch total transactions of the users 
        //this.getTotalTransactions(this._startDate, this._endDate);
        this._processPreviousIterationData(this.prevsnapshotObj);
    },

    _processPreviousIterationData: function (snapshotObj) {
        this._userDetailsPrev = [];
        var recCnt = 0;
        var _currentUser;
        var _prevUser;
        this._activeMembersPrev = [];
        this._userDetailsPrev = {};
        debugger;
        console.log("prev iteration data records : " + snapshotObj.length);
        if (snapshotObj && snapshotObj.length > 0) {
            for (var index = 0; index <= snapshotObj.length - 1; index++) {
                //debugger;
                _snapshot = snapshotObj[index];
                if (_snapshot && _snapshot.get('_User')) {
                    _currentUser = _snapshot.get('_User');
                    if (this._userDetailsPrev[_currentUser] != undefined) {
                        var counter = this._userDetailsPrev[_currentUser] + 1;
                        this._userDetailsPrev[_currentUser] = counter;
                        //if (counter >= 5 && this._activeMembers.indexOf(_currentUser) === -1) {
                        //  this._activeMembers.push(_currentUser);
                        //}
                    }
                    else {
                        this._userDetailsPrev[_currentUser] = 1;
                    }

                }
            }
            //this._generateScoreSummary();
        }
        //fetch total transactions of the users 
        //this.getPreviousIterationTotalTransactions();
        this.getTotalTransactions(this._startDate, this._endDate);
    },

    getTotalTransactions: function (startDate, endDate) {
        debugger;
        var that = this;
        var users = Ext.Object.getKeys(this._userDetails);
        var prevusers = Ext.Object.getKeys(this._userDetailsPrev);
        var allusers = users.concat(prevusers.filter(function (item) {
            return users.indexOf(item) < 0;
        }));

        //convert keys from stings to integers
        for (var k = 0; k < allusers.length; k++) {
            users[k] = parseInt(allusers[k]);
        }



        var myStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            find: {
                _TypeHierarchy: { "$in": ["HierarchicalRequirement", "Defect"] },
                CreationDate: { '$gt': that.prevStartDate, '$lt': endDate },
                ScheduleState: "In-Progress",
                Blocked: false,
                _User: { "$in": users }
            },
            fetch: ['_ValidFrom', '_ValidTo', '_RevisionNumber', '_User', 'CreationDate'],
            sort: {
                _User: 1
            },
            limit: Infinity,
            removeUnauthorizedSnapshots: true,
            listeners: {
                load: function (store, records, success) {
                    console.log("loaded %i records", records.length);
                    that._processTotalTransactions(records);
                },
                scope: this
            }
        });
    },

    _processTotalTransactions: function (snapshotObjAll) {
        this._userTotalTransactions = [];
        this.userfilterQuery = "";
        var recCnt = 0;
        var _currentUser;
        var _prevUser;
        this._activeMembers = [];
        var that = this;
        //this._userDetails = {};

        //sy code
        var users = Ext.Object.getKeys(this._userDetails);
        var prevusers = Ext.Object.getKeys(this._userDetailsPrev);
        this.prevsnapshotAllTrans = snapshotObjAll.filter(function (el) {
            return Date.parse(el.data.CreationDate) < Date.parse(that._startDate) && prevusers.indexOf(el.data._User.toString()) != -1;
        });
        snapshotObj = snapshotObjAll.filter(function (el) {
            return Date.parse(el.data.CreationDate) >= Date.parse(that._startDate) && users.indexOf(el.data._User.toString()) != -1;
        });
        console.log("current iteration data records : " + snapshotObj.length);
        //sy code

        //debugger;
        if (snapshotObj && snapshotObj.length > 0) {
            for (var index = 0; index <= snapshotObj.length - 1; index++) {
                _snapshot = snapshotObj[index];
                if (_snapshot && _snapshot.get('_User')) {
                    _currentUser = _snapshot.get('_User');
                    if (this._userTotalTransactions[_currentUser] != undefined) {
                        var counter = this._userTotalTransactions[_currentUser] + 1;
                        this._userTotalTransactions[_currentUser] = counter;
                        if (counter >= 5 && this._activeMembers.indexOf(_currentUser) === -1) {
                            this._activeMembers.push(_currentUser);
                            //debugger;
                            if (this._activeMembers.length == 1) {
                                this.userfilterQuery = "(" + "ObjectID = " + _currentUser + ")";
                            }
                            else {
                                this.userfilterQuery = "(" + this.userfilterQuery + " or " + "(" + "ObjectID = " + _currentUser + ")" + ")";
                            }

                        }
                    }
                    else {
                        this._userTotalTransactions[_currentUser] = 1
                    }

                }
            }
            this.calculateMetrics();
            this._processPrevIterationTotalTransactions(this.prevsnapshotAllTrans);


        }
    },

    calculateMetrics: function () {
        //debugger;
        this.FTE = 0, this.pTotal = 0, this.usersFTE = new Array();
        //get all users whose total transactions are more than 5
        //Get their transactions in the project, that will be P(total)
        for (var k = 0; k < this._activeMembers.length; k++) {
            this.pTotal += this._userDetails[this._activeMembers[k]];
        }
        //Fetch U(project) for all users whose U(total) >= 5
        //Do U(project)/U(total) for these users
        //Sum it, thats your FTE = team Size
        for (var k = 0; k < this._activeMembers.length; k++) {
            this.usersFTE[this._activeMembers[k]] = (this._userDetails[this._activeMembers[k]] / this._userTotalTransactions[this._activeMembers[k]]).toFixed(2);
            this.FTE += parseFloat(this.usersFTE[this._activeMembers[k]]);
        }
    },

    _processPrevIterationTotalTransactions: function (snapshotObj) {
        this._userTotalTransactionsPrev = [];
        var recCnt = 0;
        var _currentUser;
        var _prevUser;
        this.prevuserfilterQuery = "";
        //debugger;

        if (snapshotObj && snapshotObj.length > 0) {
            for (var index = 0; index <= snapshotObj.length - 1; index++) {
                _snapshot = snapshotObj[index];
                if (_snapshot && _snapshot.get('_User')) {
                    _currentUser = _snapshot.get('_User');
                    if (this._userTotalTransactionsPrev[_currentUser] != undefined) {
                        var counter = this._userTotalTransactionsPrev[_currentUser] + 1;
                        this._userTotalTransactionsPrev[_currentUser] = counter;
                        if (counter >= 5 && this._activeMembersPrev.indexOf(_currentUser) === -1) {
                            this._activeMembersPrev.push(_currentUser);
                            if (this._activeMembersPrev.length == 1) {
                                this.prevuserfilterQuery = "(" + "ObjectID = " + _currentUser + ")";
                            }
                            else {
                                this.prevuserfilterQuery = "(" + this.prevuserfilterQuery + " or " + "(" + "ObjectID = " + _currentUser + ")" + ")";
                            }
                        }
                    }
                    else {
                        this._userTotalTransactionsPrev[_currentUser] = 1
                    }

                }
            }
        }
        this.calculatePrevMetrics();
        this._generateScoreSummary();
    },

    calculatePrevMetrics: function () {
        this.prevFTE = 0, this.usersFTEPrev = new Array();
        //Fetch U(project) for all users whose U(total) >= 5
        //Do U(project)/U(total) for these users
        //Sum it, thats your FTE = team Size
        for (var k = 0; k < this._activeMembersPrev.length; k++) {
            this.usersFTEPrev[this._activeMembersPrev[k]] = this._userDetailsPrev[this._activeMembersPrev[k]] / this._userTotalTransactionsPrev[this._activeMembersPrev[k]];
            this.prevFTE += this.usersFTEPrev[this._activeMembersPrev[k]];
        }
        this.calculateTeamStability();
    },

    calculateTeamStability: function () {
        //team growth -
        //find the difference between usersFTE of current iteration and previous iteration
        var growth = 0, shrinkage = 0, teamGrowth = 0, teamShrinkage = 0, fte;
        this.teamStabilityExpl = "";
        if (!Ext.Object.isEmpty(this.usersFTE)) {
            for (user in this.usersFTE) {
                fte = (this.usersFTEPrev[user] === undefined) ? 0 : this.usersFTEPrev[user];
                growth += Math.max(0, (this.usersFTE[user] - fte));
            }
            console.log("this.fte-" + this.FTE);
            teamGrowth = (growth / this.FTE) * 100;
        }
        //debugger;
        //team shrinkage - 
        //find the difference between usersFTE of previous iteration and current iteration
        if (!Ext.Object.isEmpty(this.usersFTEPrev)) {
            for (user in this.usersFTEPrev) {
                fte = (this.usersFTE[user] === undefined) ? 0 : this.usersFTE[user];
                shrinkage += Math.max(0, (this.usersFTEPrev[user] - fte));
            }
            console.log("this.prevfte-" + this.prevFTE);
            teamShrinkage = (shrinkage / this.prevFTE) * 100;
        }

        this.teamStability = (100 - ((teamGrowth + teamShrinkage) / 2)).toFixed(0);
        if (this.teamStability <= 70) {
            this.teamStabilityExpl = "This team is not very stable.";
        }
        else {
            this.teamStabilityExpl = "This team is stable.";
        }
        this.teamStability = this.teamStability;
        if (this.teamStability == 0) {
            this.teamStabilityExpl = "Lot of changes in the team.";
        }
        if (Ext.Object.isEmpty(this.usersFTEPrev) && Ext.Object.isEmpty(this.usersFTE)) {
            this.teamStabilityExpl = "The team seems to have gone dormant, not much activity seen for the last few iterations.";
        }
    },
    _generateinitialSummary: function () {
        var htmlOverAllSumamry = '<div id="summarystatus" style="height: 40px;"><ul class="summarystatus">' +
            '<li> <span class="summarystatus_title" style="color: black;">Overall Team Health is : </span><div class="divvalflex divhealthvalue" id="divoverall" style="cursor: default;   "> <div id="divloaderoverall" class="loader"></div><div id="spnoveall" class="summarystatus_val" style="margin-top: -5px;"></div></div></li>' +
            '</ul></div>';
        var htmlTeamSizeSummary = '<div id="summarydetails"><ul class="status">' +
            '<li> <span class="summarystatus_title">Team Stability Index : </span> <div class="divvalflex divhealthvalue" id="divstability"><div id="divloaderstability" class="loader"></div><span   id="spnstability" class="summarystatus_val"> </span></div></li>' +
            '<li class="subtext"><span id="spnstabilityexpl"> ... </span></br>This is an indication of the teams stability. We consider changes to the composition of the team members for two iterations, calculate team growth and team shrinkage. This is then averaged to calculate Team volatility index, which is inversed to arrive at Team Stability Index.</li>' +
            '<li> <span class="summarystatus_title">Percent Dedicated Work Index : </span> <div class="divvalflex divhealthvalue" id="divdedicate"><div id="divloaderdedication" class="loader"></div><span  id="spndedication" class="summarystatus_val"> </span></div></li>' +
            '<li class="subtext"> <span id="spnallocationexpl">... </span></br> This indicates how much of the work for a given team is done by people dedicated to that team. The higher this index, the better is it for the team</li>' +
            '<li> <span class="summarystatus_title">Team size Index : </span> <div class="divvalflex divhealthvalue" id="divteamsize"><div id="divloaderteamsize" class="loader"></div><span  id="spnteamsize" class="summarystatus_val"> </span></div></li>' +
            '<li class="subtext">  Effective Team size :<span id="spneamsizeexpl"> </span>.</br> An ideal team should comprise of 7 team members (+-2). The more the deviation from this range, the lesser score the team is awarded. </li>' +
            '</ul></div>';

        this.down('#subchildPanel1').add({
            id: 'summaryContent1',
            padding: 10,
            maxWidth: 700,
            maxHeight: 500,
            overflowX: 'auto',
            //overflowY: 'hidden',
            html: htmlOverAllSumamry + htmlTeamSizeSummary,
            border: false,
            bodyBorder: false,
        });

        this.scoreGenerated = true;
    },

    _generateScoreSummary: function () {
        var that = this;

        var TeamSize = Math.round(this.FTE);
        var TeamSizeScore = 0;
        if ((TeamSize > 0 && TeamSize < 5) || (TeamSize > 9 && TeamSize < 14)) {
            TeamSizeScore = 30;
        }
        else if (TeamSize >= 5 && TeamSize <= 9) {
            TeamSizeScore = 70;
        }
        else if (TeamSize > 14) {
            TeamSizeScore = 10;
        }

        if (TeamSize == 7) {
            TeamSizeScore = 100;
        }
        console.log(this._userDetails);

        //Iterate through the team members array, get their total transactions and team specific transactions
        //and divide them for their allocation.  Then divide this by team size to get team's allocation
        var dedicationPerUser, totalDedication = 0;
        for (var i = 0; i < this._activeMembers.length; i++) {
            dedicationPerUser = this._userDetails[this._activeMembers[i]] / this._userTotalTransactions[this._activeMembers[i]];
            if (dedicationPerUser > 0.7)
                totalDedication += this._userDetails[this._activeMembers[i]];
        }
        if (this.pTotal == 0) {
            teamDedication = 0;
            teamAllocationExpl = "None of the team members were working full time on this project for the selected iteration.";
        }
        else {
            teamDedication = ((totalDedication / this.pTotal) * 100).toFixed(0);
            if (((totalDedication / this.pTotal) * 100).toFixed(0) == 100) {
                teamAllocationExpl = "This team has fully dedicated members";
            }
            else if (((totalDedication / this.pTotal) * 100).toFixed(0) >= 70) {
                teamAllocationExpl = "This team has fairly dedicated members";
            }
            else {
                teamAllocationExpl = "Many of this team's members seem to be working on other project tasks";
            }
        }
        //debugger;
        var overallScore = (parseFloat(this.teamStability) + parseFloat(teamDedication) + TeamSizeScore) / 3;

        //debugger;
        Ext.get("spnoveall").dom.innerText = overallScore.toFixed(0) + "%";
        Ext.get("divloaderoverall").destroy();

        Ext.get("spnstability").dom.innerHTML = this.teamStability + "%";
        Ext.get("spnstabilityexpl").dom.innerHTML = this.teamStabilityExpl;
        Ext.get("divloaderstability").destroy();

        Ext.get("spndedication").dom.innerHTML = teamDedication + "%";
        Ext.get("spnallocationexpl").dom.innerHTML = teamAllocationExpl;
        Ext.get("divloaderdedication").destroy();

        Ext.get("spnteamsize").dom.innerHTML = TeamSizeScore.toFixed(0) + "%";
        Ext.get("spneamsizeexpl").dom.innerHTML = TeamSize;
        Ext.get("divloaderteamsize").destroy();

        // Code to render sub details grid below..
        var component;
        component = Ext.query("span", "divstability");
        Ext.get(component[0]).on("click", function () {
            that._createDetailsGrid("Stability");
        });

        component = Ext.query("span", "divdedicate");
        Ext.get(component[0]).on("click", function () {
            that._createDetailsGrid("Dedication");
        });

        component = Ext.query("span", "divteamsize");
        Ext.get(component[0]).on("click", function () {
            that._createDetailsGrid("TeamSize");
        });

    },
    _createDetailsGrid: function (paramter) {
        debugger;
        var that = this;
        var renderComponent;
        var queryfilter;
        var objScope;
        if (paramter == "Dedication" || paramter == "TeamSize") {
            renderComponent = "child1";
            queryfilter = that.userfilterQuery.length > 10 ? that.userfilterQuery : "";
            objScope = that.usersFTE;
            Ext.get("pchild1").setStyle("display", "");
        }
        else if (paramter == "Stability") {
            renderComponent = "child2";
            queryfilter = that.prevuserfilterQuery.length > 10 ? that.prevuserfilterQuery : "";
            objScope = that.usersFTEPrev;
            Ext.get("pchild2").setStyle("display", "");
        }
        if (Ext.get("gridMembers" + renderComponent) !== null) {
            Ext.get("gridMembers" + renderComponent).destroy();
        }

        var url = "https://rally1.rallydev.com/slm/webservice/v2.0/user?query=" + queryfilter + "&fetch=true&start=1";
        //url = "https://rally1.rallydev.com/slm/webservice/v2.0/user?query=((ObjectID = 58371291307) or (ObjectID = 78352132972))";
        Ext.Ajax.request({
            url: url,
            method: "GET",
            scope: this,
            success: function (response) {
                var data;
                if (JSON.parse(response.responseText).QueryResult !== undefined) {
                    data = JSON.parse(response.responseText).QueryResult.Results;
                }
                //debugger;
                console.log(objScope);
                Ext.Array.each(data, function (obj) {
                    //debugger;
                    console.log("user id:" + obj.ObjectID);
                    if (obj.ObjectID !== undefined) {
                        obj.FTE = parseFloat(objScope[obj.ObjectID]).toFixed(2);
                        obj.Name = obj.FirstName + " " + obj.LastName;
                    }
                    else {
                        var ref = obj._ref;
                        ref = ref.substring(ref.lastIndexOf('/'), ref.length - ref.lastIndexOf('/'));
                        obj.FTE = parseFloat(objScope[ref]).toFixed(2);
                        obj.Name = obj._refObjectName;
                    }

                });

                var gridMembers = Ext.create('Rally.ui.grid.Grid', {
                    id: 'gridMembers' + renderComponent,
                    store: Ext.create('Rally.data.custom.Store', {
                        data: data
                    }),
                    renderTo: Ext.get(renderComponent),
                    cls: 'customGridHeader',
                    columnCfgs: [
                        {
                            text: 'Name',
                            dataIndex: 'Name',
                            flex: 1
                        },
                        {
                            text: 'FTE',
                            dataIndex: 'FTE'
                        }
                    ],
                    height: 400,
                });
                var title = "Team Members";
                this.down('#subchildPanel2').show();
                this.down('#subchildPanel2').removeAll();
                this.down('#subchildPanel2').setTitle("<span class='storydata'><b>" + title + "</b></span>");

            },
            failure: function () {
                alert('JSON REST API request failed');
                graphContainer.innerHTML = '';
            }
        });
    }
});

Rally.launchApp('TeamHealthIndicator', {
    name: 'Team Health Indicator'
});
