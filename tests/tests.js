const chai = require("chai");
const expect = chai.expect;
const assert = chai.assert;
const MongoClient = require("mongodb").MongoClient;
const query = require("..");

const TESTRECORD_COUNT = 100;

function db(f) {
    MongoClient.connect("mongodb://localhost:27017/dxtqutests", (err, db) => {
	if (err) throw err;
	f(db);
    });
}

function testQueryValues(tdone, loadOptions, test) {
    function date(start, addDays) {
	return new Date(start + (addDays * (24*60*60*1000)));
    }
    
    db(db => {
	db.dropDatabase((err, res) => {
	    const values = db.collection("values");
	    const currentYear = 2017;
	    const currentYearStart = (new Date(currentYear, 0, 1)).valueOf();
	    const nextYearStart = (new Date(currentYear + 1, 0, 1)).valueOf();
		
	    Promise.all(
		Array.from(new Array(TESTRECORD_COUNT), (v, i) => i).map(
		    n => values.insertOne({
			    date1: date(currentYearStart, n),
			    date2: date(nextYearStart, n),
			    int1: n % 10,
			    int2: n % 5,
			    string: "Item " + n
			})
		)
	    ).then(async () => {
		try {
		    test(await query(values, loadOptions));
		    tdone();
		}
		catch (err) {
		    tdone(err);
		}
	    });	
	});
    });
}

describe("query-values", function() {
    describe("#entitiesQuery.values", function() {
	it("list should retrieve all entities", function(tdone) {
	    testQueryValues(tdone, {
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "result").to.have.lengthOf(TESTRECORD_COUNT);
	    });
	});

	it("list should accept skip", function(tdone) {
	    testQueryValues(tdone, {
		skip: 5,
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount).to.eql(TESTRECORD_COUNT);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "result").to.have.lengthOf(TESTRECORD_COUNT - 5);
	    });
	});

	it("list should accept take", function(tdone) {
	    testQueryValues(tdone, {
		take: 5,
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount).to.eql(TESTRECORD_COUNT);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "result").to.have.lengthOf(5);
	    });
	});

    	it("list should sort ascending", function(tdone) {
	    testQueryValues(tdone, {
		take: 5,
		sort: [
		    {
			selector: "int1",
			desc: false
		    }
		]
	    }, function(res) {
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "result").to.have.lengthOf(5);
		expect(res.data[0].int1).to.eql(0);
		expect(res.data[1].int1).to.eql(0);
		expect(res.data[2].int1).to.eql(0);
		expect(res.data[3].int1).to.eql(0);
		expect(res.data[4].int1).to.eql(0);
	    });
	});

    	it("list should sort descending", function(tdone) {
	    testQueryValues(tdone, {
		take: 5,
		sort: [
		    {
			selector: "int1",
			desc: true
		    }
		]
	    }, function(res) {
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "result").to.have.lengthOf(5);
		expect(res.data[0].int1).to.eql(9);
		expect(res.data[1].int1).to.eql(9);
		expect(res.data[2].int1).to.eql(9);
		expect(res.data[3].int1).to.eql(9);
		expect(res.data[4].int1).to.eql(9);
	    });
	});

	it("list should filter with =", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "int1", "=", 3
		],
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(10);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(10);
	    });
	});

	it("list should filter with multiple criteria", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    ["int1", "=", 3],
		    "or",
		    ["int1", "=", 5]
		],
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(20);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(20);
	    });
	});

	it("list should search with =", function(tdone) {
	    testQueryValues(tdone, {
		searchExpr: "int1",
		searchOperation: "=",
		searchValue: 3,
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(10);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(10);
	    });
	});

	it("list should project with select", function(tdone) {
	    testQueryValues(tdone, {
		filter: [ "int1", "=", 3 ],
		requireTotalCount: false,
		select: ["int2", "date1"]
	    }, function(res) {
		//console.log("Result: ", JSON.stringify(res, null, 2));

		expect(res.data[0]).to.have.ownProperty("_id");
		expect(res.data[0]).to.have.ownProperty("int2");
		expect(res.data[0]).to.have.ownProperty("date1");

		expect(res.data[0]).to.not.have.ownProperty("int1");
		expect(res.data[0]).to.not.have.ownProperty("date2");
		expect(res.data[0]).to.not.have.ownProperty("string");
	    });
	});

	it("list should search with multiple fields", function(tdone) {
	    testQueryValues(tdone, {
		searchExpr: ["int1", "int2"],
		searchOperation: "=",
		searchValue: 3,
		requireTotalCount: true
	    }, function(res) {
		//console.log("Result: ", JSON.stringify(res, null, 2));
		
		expect(res.totalCount, "totalCount").to.eql(20);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(20);
	    });
	});

	it("list should filter with <", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "int1", "<", 5
		],
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(50);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(50);
	    });
	});

	it("list should filter with date.Month and nested array", function(tdone) {
	    testQueryValues(tdone, {
		// some pivot grid queries nest a single filter condition in an extra array
		filter: [[
		    "date1.Month", "<=", 2
		]],
		requireTotalCount: true
	    }, function(res) {
		//console.log("Result is ", JSON.stringify(res, null, 2));
		expect(res.totalCount, "totalCount").to.eql(59);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(59);
	    });
	});

	it.only("list should filter with date.Quarter", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "date1.quarter", "=", 2
		],
		requireTotalCount: true
	    }, function(res) {
		console.log("Result is ", JSON.stringify(res, null, 2));
		expect(res.totalCount, "totalCount").to.eql(10);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(10);

		expect(res.data[0].date1, "date1").to.be.a("date");
		expect(res.data[0].date2, "date2").to.be.a("date");
		expect(res.data[0].int1, "int1").to.be.a("number");
		expect(res.data[0].int2, "int2").to.be.a("number");
		expect(res.data[0].string, "string").to.be.a("string");
		expect(res.data[0].___mp2, "___mp2").to.be.undefined;
		expect(res.data[0].___date1_quarter, "___date1_quarter").to.be.undefined;
		
	    });
	});

	it("list should filter and group (sample 1)", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    ["date2.Month", ">=", 4],
		    "and",
		    ["date2.Month", "<", 7]
		],
		group: [
		    {
			groupInterval: "month",
			isExpanded: false,
			selector: "date1"
		    }
		],
		groupSummary: [
		    {
			selector: "int1",
			summaryType: "sum"
		    }
		],
		totalSummary: [{
		    selector: "int1",
		    summaryType: "sum"
		}],
		requireTotalCount: true
	    }, function(res) {
		//console.log("Result is ", JSON.stringify(res, null, 2));

		expect(res.totalCount, "totalCount").to.eql(10);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(1);

		expect(res.summary[0], "summary value").to.eql(45);
		
	    });
	});
	

	it("list should filter with endswith", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "string", "endswith", "23"
		],
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(1);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(1);
	    });
	});

	it("list should filter with endswith, no results", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "string", "endswith", "something that doesn't exist"
		],
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(0);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(0);
	    });
	});

	it("list should filter with endswith, no results, total summary defined", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "string", "endswith", "something that doesn't exist"
		],
		totalSummary: [
		    {
			selector: "int1",
			summaryType: "sum"
		    }
		],
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(0);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "list length").to.have.lengthOf(0);

		expect(res.summary, "res.summary").to.be.undefined;
	    });
	});

	it("list should calculate total summaries for simple queries", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "int1", "<", 5
		],
		totalSummary: [
		    {
			selector: "int1",
			summaryType: "sum"
		    },
		    {
			selector: "int2",
			summaryType: "max"
		    }
		],
		requireTotalCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(50);

		expect(res.summary, "res.summary").to.be.instanceof(Array);
		expect(res.summary, "res.summary").to.have.lengthOf(2);
		expect(res.summary[0], "sum(int1)").to.eql(100);
		expect(res.summary[1], "max(int2)").to.eql(4);
	    });
	});

	it("list should group with items", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "int1",
			desc: false,
			isExpanded: true
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		expect(res.groupCount, "groupCount").to.eql(10);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(10);

		for (const group of res.data) {
		    expect(group.key, "group.key").to.not.be.undefined;
		    expect(group.items, `group(${group.key}).items`).to.be.instanceof(Array);
		    expect(group.items, `group(${group.key}) items list`).to.have.lengthOf(10);
		    expect(group.count, `group(${group.key}).count`).to.eql(group.items.length);
		    
		    for (const item of group.items) {
			expect(item.int1, "item.int1").to.eql(group.key);
		    }
		}
	    });
	});

	it("list should group with items and select", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "int1",
			desc: false,
			isExpanded: true
		    }
		],
		select: ["int2", "date1"]
	    }, function(res) {
		//console.log("Result: ", JSON.stringify(res, null, 2));

		const x = res.data[0].items[0];
		
		expect(x).to.have.ownProperty("_id");
		expect(x).to.have.ownProperty("int2");
		expect(x).to.have.ownProperty("date1");

		expect(x).to.not.have.ownProperty("int1");
		expect(x).to.not.have.ownProperty("date2");
		expect(x).to.not.have.ownProperty("string");
	    });
	});

	it("list should group with items and secondary sort", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "int2",
		    "=",
		    3
		],
		group: [
		    {
			selector: "int2",
			desc: false,
			isExpanded: true
		    }
		],
		sort: [
		    {
			selector: "int1",
			desc: true
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(20);
		expect(res.groupCount, "groupCount").to.eql(1);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(1);

		for (const group of res.data) {
		    //console.log("Checking group", JSON.stringify(group, null, 2));
		    
		    expect(group.key, "group.key").to.not.be.undefined;
		    expect(group.items, `group(${group.key}).items`).to.be.instanceof(Array);
		    expect(group.items, `group(${group.key}) items list`).to.have.lengthOf(20);

		    for (let i = 0; i <= 9; i++) {
			expect(group.items[i].int1, `groupitem ${i}`).to.eql(8);
		    }
		    for (let i = 10; i <= 19; i++) {
			expect(group.items[i].int1, `groupitem ${i}`).to.eql(3);
		    }
		}
	    });
	});

	it("list should group without items", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "int1",
			desc: false
			// , isExpanded: false
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		expect(res.groupCount, "groupCount").to.eql(10);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(10);

		for (const group of res.data) {
		    expect(group.key, "group.key").to.not.be.undefined;
		    expect(group.items, `group(${group.key}).items`).to.be.null;
		    expect(group.count, `group(${group.key}).count`).to.eql(10);
		}
	    });
	});


	it("list should group without items, with filter", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    "int1",
		    "=",
		    3
		],
		group: [
		    {
			selector: "int1",
			desc: false
			// , isExpanded: false
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(10);
		expect(res.groupCount, "groupCount").to.eql(1);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(1);

		for (const group of res.data) {
		    expect(group.key, "group.key").to.not.be.undefined;
		    expect(group.items, `group(${group.key}).items`).to.be.null;
		    expect(group.count, `group(${group.key}).count`).to.eql(10);
		}
	    });
	});

	it("list should group without items, with complex filter", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    [
			"int1",
			"=",
			3
		    ],
		    "or",
		    [
			"int1",
			"=",
			5
		    ],
		    "or",
		    [
			"int1",
			"=",
			7
		    ]
		],
		group: [
		    {
			selector: "int1",
			desc: false
			// , isExpanded: false
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(30);
		expect(res.groupCount, "groupCount").to.eql(3);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(3);

		for (const group of res.data) {
		    expect(group.key, "group.key").to.not.be.undefined;
		    expect(group.items, `group(${group.key}).items`).to.be.null;
		    expect(group.count, `group(${group.key}).count`).to.eql(10);
		}
	    });
	});

	it("list should group with items, with complex filter", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    [
			"int1",
			"=",
			3
		    ],
		    "or",
		    [
			"int1",
			"=",
			5
		    ],
		    "or",
		    [
			"int1",
			"=",
			7
		    ]
		],
		group: [
		    {
			selector: "int1",
			desc: false,
			isExpanded: true
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(30);
		expect(res.groupCount, "groupCount").to.eql(3);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(3);

		for (const group of res.data) {
		    expect(group.key, "group.key").to.not.be.undefined;
		    expect(group.items, `group(${group.key}).items`).to.be.instanceof(Array);

		    expect(group.items, "group items list").to.have.lengthOf(10);
		    expect(group.count, `group(${group.key}).count`).to.eql(group.items.length);
		    
		    for (const item of group.items) {
			expect(item.int1, "item.int1").to.eql(group.key);
		    }

		}
	    });
	});

	it("list should group two levels with bottom-level items", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    [
			[ "int1", "=", 3 ],
			"or",
			[ "int1", "=", 6 ]
		    ],
		    "and",
		    [
			[ "int2", "=", 3 ],
			"or",
			[ "int2", "=", 1 ]
		    ]
		],
		group: [
		    {
			selector: "int1",
			desc: false,
			isExpanded: false
		    },
		    {
			selector: "int2",
			desc: false,
			isExpanded: true
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		//console.log("Result is ", JSON.stringify(res, null, 2));
		
		expect(res.totalCount, "totalCount").to.eql(20);
		expect(res.groupCount, "groupCount").to.eql(2);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(2);

		for (const group1 of res.data) {
		    expect(group1.key, "group1.key").to.not.be.undefined;
		    expect(group1.items, `group1(${group1.key}).items`).to.be.instanceof(Array);

		    expect(group1.items, "group1 items list").to.have.lengthOf(1);
		    expect(group1.count, `group(${group1.key}).count`).to.eql(group1.items.length);

		    for (const group2 of group1.items) {
			expect(group2.key, "group2.key").to.not.be.undefined;
			expect(group2.items, `group2(${group2.key}).items`).to.be.instanceof(Array);
			
			expect(group2.items, "group2 items list").to.have.lengthOf(10);
			expect(group2.count, `group(${group2.key}).count`).to.eql(group2.items.length);
			for (const item of group2.items) {
			    expect(item.int1, "item.int1").to.eql(group1.key);
			    expect(item.int2, "item.int2").to.eql(group2.key);
			}
		    }

		}
	    });
	});

	it("list should group two levels without bottom-level items", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    [
			[ "int1", "=", 3 ],
			"or",
			[ "int1", "=", 6 ]
		    ],
		    "and",
		    [
			[ "int2", "=", 3 ],
			"or",
			[ "int2", "=", 1 ]
		    ]
		],
		group: [
		    {
			selector: "int1",
			desc: false,
			isExpanded: false
		    },
		    {
			selector: "int2",
			desc: false,
			isExpanded: false
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		//console.log("Result is ", JSON.stringify(res, null, 2));
		
		expect(res.totalCount, "totalCount").to.eql(20);
		expect(res.groupCount, "groupCount").to.eql(2);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(2);

		for (const group1 of res.data) {
		    expect(group1.key, "group1.key").to.not.be.undefined;
		    expect(group1.items, `group1(${group1.key}).items`).to.be.instanceof(Array);

		    expect(group1.items, "group1 items list").to.have.lengthOf(1);
		    expect(group1.count, `group(${group1.key}).count`).to.eql(group1.items.length);

		    for (const group2 of group1.items) {
			expect(group2.key, "group2.key").to.not.be.undefined;
			expect(group2.items, "group2 items list").to.be.null;
			expect(group2.count, `group(${group2.key}).count`).to.eql(10);
		    }

		}
	    });
	});

	
	it("list should calculate total summaries group query", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    [
			[ "int1", "=", 3 ],
			"or",
			[ "int1", "=", 6 ]
		    ],
		    "and",
		    [
			[ "int2", "=", 3 ],
			"or",
			[ "int2", "=", 1 ]
		    ]
		],
		group: [
		    {
			selector: "int1",
			desc: false,
			isExpanded: false
		    },
		    {
			selector: "int2",
			desc: false,
			isExpanded: false
		    }
		],
		totalSummary: [
		    {
			selector: "int1",
			summaryType: "sum"
		    },
		    {
			selector: "int2",
			summaryType: "max"
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		//console.log("Result is ", JSON.stringify(res, null, 2));
		
		expect(res.totalCount, "totalCount").to.eql(20);
		expect(res.groupCount, "groupCount").to.eql(2);

		expect(res.summary, "res.summary").to.be.instanceof(Array);
		expect(res.summary, "res.summary").to.have.lengthOf(2);
		expect(res.summary[0], "sum(int1)").to.eql(90);
		expect(res.summary[1], "max(int2)").to.eql(3);
	    });
	});

	it("list should calculate group summaries", function(tdone) {
	    testQueryValues(tdone, {
		filter: [
		    [ "int1", "=", 3 ],
		    "or",
		    [ "int1", "=", 6 ]
		],
		group: [
		    {
			selector: "int1",
			desc: false,
			isExpanded: false
		    }
		],
		groupSummary: [
		    {
			selector: "int1",
			summaryType: "sum"
		    },
		    {
			selector: "int2",
			summaryType: "max"
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		//console.log("Result is ", JSON.stringify(res, null, 2));
		
		expect(res.totalCount, "totalCount").to.eql(20);
		expect(res.groupCount, "groupCount").to.eql(2);

		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(2);

		expect(res.data[0].summary, "group1.summary").to.be.instanceof(Array);
		expect(res.data[0].summary, "group1.summary").to.have.lengthOf(2);
		expect(res.data[0].summary[0], "group1.sum(int1)").to.eql(30);
		expect(res.data[0].summary[1], "group1.max(int2)").to.eql(3);

		expect(res.data[1].summary, "group2.summary").to.be.instanceof(Array);
		expect(res.data[1].summary, "group2.summary").to.have.lengthOf(2);
		expect(res.data[1].summary[0], "group2.sum(int1)").to.eql(60);
		expect(res.data[1].summary[1], "group2.max(int2)").to.eql(1);
	    });
	});

	it("list should group with groupInterval quarter", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "date1",
			groupInterval: "quarter"
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		expect(res.groupCount, "groupCount").to.eql(2);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(2);

		expect(res.data[0].key, "group 1.key").to.not.be.undefined;
		expect(res.data[0].items, `group 1.items`).to.be.null;
		expect(res.data[0].count, `group 1.count`).to.eql(90);
		expect(res.data[1].key, "group 2.key").to.not.be.undefined;
		expect(res.data[1].items, `group 2.items`).to.be.null;
		expect(res.data[1].count, `group 2.count`).to.eql(10);
		
	    });
	});

	it("list should group with groupInterval month", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "date1",
			groupInterval: "month"
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		expect(res.groupCount, "groupCount").to.eql(4);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(4);

		expect(res.data[0].key, "group 1.key").to.eql(1);
		expect(res.data[0].items, `group 1.items`).to.be.null;
		expect(res.data[0].count, `group 1.count`).to.eql(31);
		expect(res.data[1].key, "group 2.key").to.eql(2);
		expect(res.data[1].items, `group 2.items`).to.be.null;
		expect(res.data[1].count, `group 2.count`).to.eql(28);
		expect(res.data[2].key, "group 3.key").to.eql(3);
		expect(res.data[2].items, `group 3.items`).to.be.null;
		expect(res.data[2].count, `group 3.count`).to.eql(31);
		expect(res.data[3].key, "group 4.key").to.eql(4);
		expect(res.data[3].items, `group 4.items`).to.be.null;
		expect(res.data[3].count, `group 4.count`).to.eql(10);
		
	    });
	});

	it("list should group with groupInterval dayOfWeek", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "date1",
			groupInterval: "dayOfWeek"
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		expect(res.groupCount, "groupCount").to.eql(7);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(7);		
	    });
	});

	it("list should group with groupInterval 2", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "int1",
			groupInterval: 2
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		//console.log("Result is ", JSON.stringify(res, null, 2));
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		expect(res.groupCount, "groupCount").to.eql(5);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(5);

		expect(res.data[0].key, "group 1 key").to.eql(0);
		expect(res.data[1].key, "group 2 key").to.eql(2);
		expect(res.data[2].key, "group 3 key").to.eql(4);
		expect(res.data[3].key, "group 4 key").to.eql(6);
		expect(res.data[4].key, "group 5 key").to.eql(8);
		
	    });
	});

	it("list should group with groupInterval quarter and summaries", function(tdone) {
	    testQueryValues(tdone, {
		group: [
		    {
			selector: "date1",
			groupInterval: "quarter"
		    }
		],
		groupSummary: [
		    {
			selector: "int1",
			summaryType: "count"
		    }
		],
		totalSummary: [
		    {
			selector: "int1",
			summaryType: "count"
		    }
		],
		requireTotalCount: true,
		requireGroupCount: true
	    }, function(res) {
		expect(res.totalCount, "totalCount").to.eql(TESTRECORD_COUNT);
		expect(res.groupCount, "groupCount").to.eql(2);
		
		expect(res.data, "res.data").to.be.instanceof(Array);
		expect(res.data, "group list length").to.have.lengthOf(2);

		expect(res.summary, "res.summary").to.be.instanceof(Array);
		expect(res.summary, "res.summary length").to.have.lengthOf(1);
		

		expect(res.data[0].key, "group 1.key").to.not.be.undefined;
		expect(res.data[0].items, `group 1.items`).to.be.null;
		expect(res.data[0].count, `group 1.count`).to.eql(90);
		expect(res.data[0].summary, "group 1 summary").to.be.instanceof(Array);
		expect(res.data[0].summary, "group 1 summary length").to.have.lengthOf(1);
		
		expect(res.data[1].key, "group 2.key").to.not.be.undefined;
		expect(res.data[1].items, `group 2.items`).to.be.null;
		expect(res.data[1].count, `group 2.count`).to.eql(10);
		expect(res.data[1].summary, "group 2 summary").to.be.instanceof(Array);
		expect(res.data[1].summary, "group 2 summary length").to.have.lengthOf(1);
		
	    });
	});


    });
});
