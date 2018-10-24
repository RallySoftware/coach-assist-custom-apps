Ext.define('Rally.ReleseHealthInsight', {
    extend: 'Rally.app.App',
    componentCls: 'relesehealthinsight',
    getSettingsFields: function () {
        return [
            {
                name: 'pastreleases',
                fieldLabel: 'Number of past releases to consider',
                xtype: 'rallynumberfield'
            },
            {
                name: 'wipcriteria',
                fieldLabel: 'WIP Calculation Criteria',
                xtype: 'rallycombobox',
                store: [['points', 'Artifacts Points'], ['count', 'Artifacts Count']],
                mode: 'local',
            }
        ];
    },
    config: {
        defaultSettings: {
            pastreleases: 10,
            wipcriteria: 'points'
        }
    },
    launch: function () {

        var context = this.getContext();
        var currentProject = context.getProject()._ref;
        console.log('current project:', this.getContext().getProject().ObjectID);
        var that = this;
        //debugger;
        this.pastReleases = this.getSetting('pastreleases');
        this.wipBy = this.getSetting('wipcriteria');
        console.log("No of past releases - " + this.pastReleases);
        console.log("Wip BY - " + this.wipBy);

        var panel = Ext.create('Ext.panel.Panel', {
            layout: 'vbox',
            itemId: 'parentPanel',
            componentCls: 'panel',
            border: false,
            bodyBorder: false,
            items: [
                {
                    xtype: 'panel',
                    layout: 'hbox',
                    margin: '10 10 10 10',
                    itemId: 'rowPanel1',
                    border: false,
                    bodyBorder: false,
                    items: [
                        {
                            xtype: 'panel',
                            title: '<p><b>Release Health Insights</b></p>',
                            width: 400,
                            itemId: 'childPanel1',
                            margin: '10 10 10 10',

                        },
                        {
                            xtype: 'panel',
                            title: '',
                            layout: 'vbox',
                            width: 950,
                            margin: '10 10 10 40',
                            border: false,
                            bodyBorder: false,
                            items: [
                                {
                                    xtype: 'panel',
                                    title: '',
                                    width: 900,
                                    itemId: 'childPanel2',
                                    border: false,
                                    bodyBorder: false,
                                    hidden: true,
                                    html: '<div class="slidecontainer"><span>Graph View</span> <input type="range" min="1" max="2" value="1" class="slider" id="myRange"><span> Table View </span></div>',
                                },
                                {
                                    xtype: 'panel',
                                    title: '',
                                    width: 900,
                                    itemId: 'childPanel3',
                                    margin: '0 10 10 10',
                                    hidden: true,
                                }

                            ]
                        }
                    ]

                },
                {
                    xtype: 'panel',
                    title: '',
                    layout: 'vbox',
                    width: 600,
                    itemId: 'rowPanel2',
                    margin: '10 10 10 10',
                    border: false,
                    bodyBorder: false,
                    hidden: true,
                    items: [
                        {
                            xtype: 'panel',
                            title: '',
                            width: 950,
                            itemId: 'childPanel4',
                            border: false,
                            bodyBorder: false,

                            html: '<div class="slidecontainer"><span>Graph View</span> <input type="range" min="1" max="2" value="1" class="slider" id="paramSlider"><span> Table View </span></div>',
                        },
                        {
                            xtype: 'panel',
                            title: '',
                            width: 400,
                            itemId: 'childPanel5',
                            margin: '10 10 10 10',
                        }

                    ]
                }
            ],
        });


        this.add(panel);

        this.ReleaseData = [];
        this.ReleaseWIPData = [];

        this._getReleases();
    },
    _getReleases: function () {
        var that = this;
        var project = 58086672505;//this.getContext().getProject().ObjectID;
        //var pastReleases = 10;
        var WIPLabel = "1. WIP Score";
        var CycleTimeLabel = "2. Cycle Time Score";
        var SayDoLabel = "3. Say/Do Ratio";
        var PriorityItemLabel = "4. Priority items first";
        var DataIntegrityLabel = "5. Data integrity score";
        var ThroughutLabel = "6. Throughput Score";

        var url = 'https://rally1.rallydev.com/slm/webservice/v2.0/Release?query=(ReleaseStartDate <= "today")&start=1&pagesize=' + that.pastReleases + '&order=ReleaseStartDate%20DESC%2CReleaseDate%20DESC%2CObjectID&fetch=Name%2CReleaseStartDate%2CReleaseDate%2CObjectID%2CPlanEstimate%2CAccepted%2C&includePermissions=true&compact=true&projectScopeUp=false&projectScopeDown=false&project=/project/' + project;


        Ext.Ajax.request({
            url: url,
            method: "GET",
            scope: this,
            success: function (response) {
                //debugger;
                var data = JSON.parse(response.responseText).QueryResult.Results
                for (var index = 0; index <= data.length - 1; index++) {
                    var obj = data[index];
                    that._processReleaseData(obj, index);
                }

                if (that.ReleaseData.length > 1) {
                    that.currentRelease = [
                        {
                            ParamName: "Release " + that.ReleaseData[0].Name,
                            ParamVal: that.ReleaseData[0].ConsolidatedScore,
                            ParamDirection: that.ReleaseData[0].ConsolidatedScore > that.ReleaseData[1].ConsolidatedScore ? 'Up' : 'Down'
                        },
                        {
                            ParamName: WIPLabel,
                            ParamVal: that.ReleaseData[0].WIPScore,
                            ParamDirection: that.ReleaseData[0].WIPScore > that.ReleaseData[1].WIPScore ? 'Up' : 'Down'
                        },
                        {
                            ParamName: CycleTimeLabel,
                            ParamVal: that.ReleaseData[0].CycleTimeScore,
                            ParamDirection: that.ReleaseData[0].CycleTimeScore > that.ReleaseData[1].CycleTimeScore ? 'Up' : 'Down'
                        },
                        {
                            ParamName: SayDoLabel,
                            ParamVal: that.ReleaseData[0].SayDoRatioScore,
                            ParamDirection: that.ReleaseData[0].SayDoRatioScore > that.ReleaseData[1].SayDoRatioScore ? 'Up' : 'Down'
                        },
                        {
                            ParamName: PriorityItemLabel,
                            ParamVal: that.ReleaseData[0].PriorityScore,
                            ParamDirection: that.ReleaseData[0].PriorityScore > that.ReleaseData[1].PriorityScore ? 'Up' : 'Down'
                        },
                        {
                            ParamName: DataIntegrityLabel,
                            ParamVal: that.ReleaseData[0].DataIntegrityScore,
                            ParamDirection: that.ReleaseData[0].DataIntegrityScore > that.ReleaseData[1].DataIntegrityScore ? 'Up' : 'Down'
                        },
                        {
                            ParamName: ThroughutLabel,
                            ParamVal: that.ReleaseData[0].ThroughputScore,
                            ParamDirection: that.ReleaseData[0].ThroughputScore > that.ReleaseData[1].ThroughputScore ? 'Up' : 'Down'
                        }
                    ];

                    that._createOverviewGrid(that.currentRelease, '#childPanel1', 'gridoverall');

                }
            },
            failure: function () {
                alert('JSON REST API request failed');
            }
        });

        return;
    },
    _processReleaseData: function (obj, index) {

        var releaseName = obj.Name;
        var wipObject = this._generateWIPObject(obj);
        var cycleTimeObject = this._generateCycleTimeObject(obj);
        var sayDoRatioObject = this._generateCycleTimeObject(obj);
        var priorityObject = this._generateCycleTimeObject(obj);
        var dataIntegrityObject = this._generateCycleTimeObject(obj);
        var throughputObject = this._generateCycleTimeObject(obj);
        var consolidatedObject = this._generateCycleTimeObject(obj);

        var releaseObject = {
            Name: releaseName,
            WIPScore: wipObject.Score,
            CycleTimeScore: cycleTimeObject.Score,
            SayDoRatioScore: sayDoRatioObject.Score,
            PriorityScore: priorityObject.Score,
            DataIntegrityScore: dataIntegrityObject.Score,
            ThroughputScore: throughputObject.Score,
            ConsolidatedScore: consolidatedObject.Score
        };

        this.ReleaseData.push(releaseObject);
        this.ReleaseWIPData.push(wipObject);
    },

    _generateWIPObject: function (obj) {
        var releaseName = obj.Name;
        var plannedArtifacts = obj.PlanEstimate;
        var acceptedArtifacts = obj.Accepted;
        var releaseObjID = obj.ObjectID;
        var noReleaseDays = 0; // this need to be calculated
        var varianceWIP = 2.5; // this need to be calculated
        var finalWIPScore = this._generateRandomScore(40, 60);
        var totalCount = 0;
        var totalPoints = 0;
        var WIP = [];
        //Fetch data from ReleaseCumulativeFlow object for this release
        Ext.Ajax.request({
            url: 'https://rally1.rallydev.com/slm/webservice/v2.0/ReleaseCumulativeFlowData?query=((CreationDate <= "today") AND (ReleaseObjectID = ' + releaseObjID + '))&pagesize=2000&fetch=CardCount%2CCardEstimateTotal%2CCardState%2CCreationDate',
            method: "GET",
            scope: this,
            async: false,
            success: function (response) {
                //debugger;
                var data = JSON.parse(response.responseText).QueryResult.Results
                for (var index = 0; index <= data.length - 1; index++) {
                    var obj = data[index];
                    if (WIP[obj.CreationDate] == undefined) {
                        WIP[obj.CreationDate] = new Object();
                        WIP[obj.CreationDate]['totalCount'] = 0;
                        WIP[obj.CreationDate]['totalPoints'] = 0;
                    }
                    //Check if card state is In-Progress 
                    if (obj.CardState == "In-Progress") {
                        WIP[obj.CreationDate]['WIPCount'] = obj.CardCount;
                        WIP[obj.CreationDate]['WIPPoints'] = obj.CardEstimateTotal;
                    }
                    WIP[obj.CreationDate]['totalCount'] = WIP[obj.CreationDate]['totalCount'] + obj.CardCount;
                    WIP[obj.CreationDate]['totalPoints'] = WIP[obj.CreationDate]['totalPoints'] + obj.CardEstimateTotal;
                }
                //Convert above array into a iteratable array
                WIP = Ext.Object.getValues(WIP);
                //Loop through the arrays and find dailyWIPPercents
                Ext.Array.each(WIP, function (item) {
                    item['percentWIPCount'] = item['WIPCount'] != 0 ? Math.round((item['WIPCount'] / item['totalCount']) * 100) : 0;
                    item['percentWIPPoints'] = item['WIPPoints'] != 0 ? Math.round((item['WIPPoints'] / item['totalPoints']) * 100) : 0;
                    //console.log(item['percentWIPCount']);
                    return true;
                }, this);
                //Average release WIP percent
                averageWIPCount = Math.round(Ext.Array.mean(Ext.Array.pluck(WIP, 'percentWIPCount')));
                averageWIPPoints = Math.round(Ext.Array.mean(Ext.Array.pluck(WIP, 'percentWIPPoints')));
                //Fetch total number of days in release
                noReleaseDays = Ext.Array.pluck(WIP, 'percentWIPCount').length;
                //debugger;
                varianceWIP = Math.round(Rally.data.lookback.Lumenize.functions.variance(Ext.Array.pluck(WIP, 'WIPCount')));
                finalWIPScore = Math.round((0.9 * averageWIPCount) + (0.1 * varianceWIP));
            },
            failure: function (response) {

            }
        });
        https://rally1.rallydev.com/slm/webservice/v2.0/Release?query=(ReleaseStartDate <= "today")
        var wipObj = {
            Name: releaseName,
            ArtifactsPlanned: plannedArtifacts,
            ArtifactsAccepted: acceptedArtifacts,
            AverageDailyWIP: averageWIPCount + '%',
            ReleaseDays: noReleaseDays,
            WIPVariance: varianceWIP,
            Score: finalWIPScore
        };

        return wipObj;
    },
    _generateCycleTimeObject: function (obj) {
        //Logic to calculate CycleTimeScore
        var finalScore = this._generateRandomScore(60, 80);
        var cycleTimeObj = {
            Score: finalScore
        };
        return cycleTimeObj;
    },
    _generateRandomScore(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    _createOverviewGrid: function (data, panel, gridid) {
        var that = this;

        var g = Ext.create('Rally.ui.grid.Grid', {
            id: gridid,
            store: Ext.create('Rally.data.custom.Store', {
                data: data,
            }),
            context: this.getContext(),
            showRowActionsColumn: false,
            hidePaginationBar: true,
            hideHeaders: true,
            cls: 'overviewGridHeader',

            columnCfgs: [
                {
                    text: 'ParamName',
                    dataIndex: 'ParamName',
                    flex: 1,
                    tdCls: 'serial-column',
                },
                {
                    text: 'ParamVal',
                    dataIndex: 'ParamVal',
                    tdCls: 'serial-column',
                },
                {
                    text: 'ParamVal2',
                    dataIndex: 'ParamDirection',
                    renderer: function (value) {
                        if (value == 'Up')
                            return "<div class='opener' id='divreleasescore'><div class='triangle-up'></div><div class='rectangle' style=background-color:green></div></div>";
                        else
                            return "<div class='opener' id='divreleasescore'><div class='rectangle' style=background-color:red></div><div class='triangle-down'></div></div>";
                    }
                }
            ],
            viewConfig: {
                listeners: {
                    viewready: function (view) {
                        Ext.get(view.getNode(0)).addCls('first-row');
                    }
                }
            },
            listeners: {
                'cellclick': function (obj, e) {
                    //debugger;
                    // Code to get row index
                    that._showReleaseView(that.ReleaseData);
                }
            },
            pagingToolbarCfg:
                {
                    hidden: true,
                },
        });
        this.down(panel).add(gridid);
    },
    _showReleaseView: function (records) {
        var that = this;
        // debugger;
        var columnCfgs = [
            {
                text: 'Release Name',
                dataIndex: 'Name',
                flex: 1
            },
            {
                text: 'WIP Score',
                dataIndex: 'WIPScore',
            },
            {
                text: 'Cycle Time Score',
                dataIndex: 'CycleTimeScore',
            },
            {
                text: 'Say/Do Ratio Score',
                dataIndex: 'SayDoRatioScore',
            },
            {
                text: 'Priority Score',
                dataIndex: 'PriorityScore',
            },
            {
                text: 'Data Integrity Score',
                dataIndex: 'DataIntegrityScore',
            },
            {
                text: 'Throughput Score',
                dataIndex: 'ThroughputScore',
            },
            {
                text: 'Consolidated Score',
                dataIndex: 'ConsolidatedScore',
            }
        ]


        var releaseGrid = Ext.create('Rally.ui.grid.Grid', {
            id: 'releaseGrid',
            store: Ext.create('Rally.data.custom.Store', {
                data: records,
            }),
            context: this.getContext(),
            cls: 'releaseGridHeader',
            columnCfgs: columnCfgs,
            //height: 400,
            showRowActionsColumn: false,
            listeners: {
                'cellclick': function (obj, e) {
                    that._showDimensions();
                }
            },
            pagingToolbarCfg:
                {

                    hidden: true,
                }
        });

        var graphFields = ['Name', 'WIPScore', 'CycleTimeScore', 'SayDoRatioScore', 'PriorityScore', 'DataIntegrityScore', 'ThroughputScore'];
        var graphData = records.slice(0);
        var store = Ext.create('Ext.data.JsonStore', {
            fields: graphFields,
            data: graphData.reverse()
        });

        var seriesObjArr = [];
        seriesObjArr.push(that._createLineObject('Name', 'WIPScore', 'Work in progress'));
        seriesObjArr.push(that._createLineObject('Name', 'CycleTimeScore', 'Cycle Time'));
        seriesObjArr.push(that._createLineObject('Name', 'SayDoRatioScore', 'Say/Do Ratio'));
        seriesObjArr.push(that._createLineObject('Name', 'PriorityScore', 'Priority'));
        seriesObjArr.push(that._createLineObject('Name', 'DataIntegrityScore', 'Data Integrity'));
        seriesObjArr.push(that._createLineObject('Name', 'ThroughputScore', 'Throughput'));


        var releaseChart = Ext.create('Ext.chart.Chart', {
            id: 'releaseChart',
            width: 900,
            height: 270,
            animate: true,
            store: store,
            legend: {
                position: 'bottom'
            },
            axes: [
                {
                    type: 'Numeric',
                    position: 'left',
                    fields: graphFields,
                    title: 'Score',
                    grid: true,
                    minimum: 0
                },
                {
                    type: 'Category',
                    position: 'bottom',
                    fields: ['Name'],
                    //title: 'Releases'
                }
            ],
            series: seriesObjArr
        });

        this.down('#childPanel2').show();
        this.down('#childPanel3').show();
        this.down('#childPanel3').removeAll();
        this.down('#childPanel3').add(releaseChart);
        this.down('#childPanel3').add(releaseGrid);
        this.down('#releaseGrid').hide();
        this.down('#releaseChart').show();

        var slider = document.getElementById("myRange");
        slider.oninput = function () {
            if (this.value == 1) {
                that.down('#releaseGrid').hide();
                that.down('#releaseChart').show();

            }
            else if (this.value == 2) {
                that.down('#releaseGrid').show();
                that.down('#releaseChart').hide();
            }
        }
    },
    _createLineObject: function (xField, yField, Label) {
        var that = this;
        var seriesObj = {
            type: 'line',
            highlight: {
                size: 1,
                radius: 1
            },
            axis: 'left',
            fill: false,
            xField: xField,
            yField: yField,
            title: Label,
            markerConfig: {
                type: 'circle',
                size: 5,
                radius: 5,
                'stroke-width': 0
            },
            label: {
                display: 'over',
                field: yField
            },
            listeners: {
                'itemclick': function (item, eOpts) {
                    that._grapghElementClick(item, eOpts);
                }
            },

        };
        return seriesObj;
    },
    _grapghElementClick: function (item, eOpts) {
        if (item.series.yField == 'WIPScore') {
            this._showDimensions();
        }
    },
    _showDimensions: function () {
        var that = this;

        if (that.ReleaseWIPData.length > 1) {
            that.paramData = [
                {
                    ParamName: 'WIP for ' + that.ReleaseWIPData[0].Name,
                    ParamVal: that.ReleaseWIPData[0].Score,
                    ParamDirection: that.ReleaseWIPData[0].Score > that.ReleaseWIPData[1].Score ? 'Up' : 'Down'
                },
                {
                    ParamName: '1. Artifacts Planned',
                    ParamVal: that.ReleaseWIPData[0].ArtifactsPlanned,
                    ParamDirection: that.ReleaseWIPData[0].ArtifactsPlanned > that.ReleaseWIPData[1].ArtifactsPlanned ? 'Up' : 'Down'
                },
                {
                    ParamName: '2. Artifacts Accepted',
                    ParamVal: that.ReleaseWIPData[0].ArtifactsAccepted,
                    ParamDirection: that.ReleaseWIPData[0].ArtifactsAccepted > that.ReleaseWIPData[1].ArtifactsAccepted ? 'Up' : 'Down'
                },
                {
                    ParamName: '3. Average Daily WIP',
                    ParamVal: that.ReleaseWIPData[0].AverageDailyWIP,
                    ParamDirection: that.ReleaseWIPData[0].AverageDailyWIP > that.ReleaseWIPData[1].AverageDailyWIP ? 'Up' : 'Down'
                },
                {
                    ParamName: '4. No of days in Release',
                    ParamVal: that.ReleaseWIPData[0].ReleaseDays,
                    ParamDirection: that.ReleaseWIPData[0].ReleaseDays > that.ReleaseWIPData[1].ReleaseDays ? 'Up' : 'Down'
                },
                {
                    ParamName: '5. WIP variance',
                    ParamVal: that.ReleaseWIPData[0].WIPVariance,
                    ParamDirection: that.ReleaseWIPData[0].WIPVariance > that.ReleaseWIPData[1].WIPVariance ? 'Up' : 'Down'
                }
            ];

        }

        var title = "WIP Details"
        this.down('#rowPanel2').show();
        this.down('#rowPanel2').setTitle("<span class='releaseheaders'><b>" + title + "</b></span>");

        this.down('#childPanel5').show();
        this.down('#childPanel5').removeAll();

        this._createOverviewGrid(that.paramData, '#childPanel5', 'gridparamlevel');

        var graphFields = ['Name', 'WIPScore'];

        var graphData = that.ReleaseData.slice(0);
        var store = Ext.create('Ext.data.JsonStore', {
            fields: graphFields,
            data: graphData.reverse()
        });

        var seriesObjArr = [];
        seriesObjArr.push(that._createLineObject('Name', 'WIPScore', 'Work in progress'));

        var dimensionChart = Ext.create('Ext.chart.Chart', {
            id: 'dimensionChart',
            width: 400,
            height: 270,
            animate: true,
            store: store,
            legend: {
                position: 'bottom'
            },
            axes: [
                {
                    type: 'Numeric',
                    position: 'left',
                    fields: graphFields,
                    title: 'Score',
                    grid: true,
                    minimum: 0
                },
                {
                    type: 'Category',
                    position: 'bottom',
                    fields: ['Name'],
                    //title: 'Releases'
                }
            ],
            series: seriesObjArr
        });

        this.down('#childPanel5').add(dimensionChart);
        this.down('#gridparamlevel').hide();
        this.down('#dimensionChart').show();

        var slider = document.getElementById("paramSlider");
        slider.oninput = function () {
            if (this.value == 1) {
                that.down('#gridparamlevel').hide();
                that.down('#dimensionChart').show();

            }
            else if (this.value == 2) {
                that.down('#gridparamlevel').show();
                that.down('#dimensionChart').hide();
            }
        }
    },
});


Rally.launchApp('Rally.ReleseHealthInsight', {
    name: 'Relese Health Insight'
});
