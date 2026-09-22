// Default seed data for ResQHub Disaster Management System

const INITIAL_DATA = {
  activeDisaster: {
    name: "Cyclone & Flash Flood Alert: Code Red",
    severity: "Category 4 Cyclone & Tidal Surge",
    affectedArea: "Coastal Metropolitan & Low-lying River Basins",
    waterLevel: "3.8 meters above baseline",
    windSpeed: "145 km/h",
    evacuationStatus: "Mandatory in Sectors 1 through 5",
    broadcastMessage: "EMERGENCY BROADCAST: Flash flooding reported in Sector 3 & 4. Move to designated high-ground shelters immediately. Do not cross flooded roads."
  },

  shelters: [
    {
      id: "sh-1",
      name: "St. Jude High School Relief Camp",
      address: "Sector 2, High Ground Ave",
      lat: 19.0850,
      lng: 72.8520,
      totalCapacity: 600,
      currentOccupancy: 420,
      supplies: { foodDays: 5, cleanWaterLiters: 12000, medicalKits: 45 },
      contact: "+91 98201 11223",
      status: "Accepting Evacuees",
      type: "Safe Zone"
    },
    {
      id: "sh-2",
      name: "Metro Sports Arena Mega Shelter",
      address: "Bandra Elevated Ring Road",
      lat: 19.0596,
      lng: 72.8390,
      totalCapacity: 1200,
      currentOccupancy: 1150,
      supplies: { foodDays: 3, cleanWaterLiters: 25000, medicalKits: 80 },
      contact: "+91 98202 33445",
      status: "Near Capacity",
      type: "Primary Shelter"
    },
    {
      id: "sh-3",
      name: "Community Civic Center Hub",
      address: "North Hilltop District",
      lat: 19.1136,
      lng: 72.8697,
      totalCapacity: 450,
      currentOccupancy: 180,
      supplies: { foodDays: 7, cleanWaterLiters: 9500, medicalKits: 30 },
      contact: "+91 98203 55667",
      status: "Accepting Evacuees",
      type: "Safe Zone"
    },
    {
      id: "sh-4",
      name: "Dadar Central Relief Center",
      address: "Civic Ground, Central Sector",
      lat: 19.0178,
      lng: 72.8478,
      totalCapacity: 800,
      currentOccupancy: 790,
      supplies: { foodDays: 2, cleanWaterLiters: 4000, medicalKits: 15 },
      contact: "+91 98204 77889",
      status: "Critical Capacity",
      type: "Secondary Shelter"
    }
  ],

  hospitals: [
    {
      id: "hosp-1",
      name: "City Trauma & General Hospital",
      lat: 19.0720,
      lng: 72.8650,
      totalIcuBeds: 50,
      availableIcuBeds: 8,
      bloodStockStatus: "Critical (O-, A+ needed)",
      emergencyAmbulances: 6,
      generatorBackup: "Operational (48 hrs fuel remaining)"
    },
    {
      id: "hosp-2",
      name: "Memorial Coastal Health Center",
      lat: 19.0450,
      lng: 72.8250,
      totalIcuBeds: 35,
      availableIcuBeds: 2,
      bloodStockStatus: "Moderate",
      emergencyAmbulances: 2,
      generatorBackup: "Operational (24 hrs fuel remaining)"
    }
  ],

  sosAlerts: [
    {
      id: "sos-101",
      timestamp: "10 mins ago",
      name: "Ramesh Sharma",
      phone: "+91 98210 99881",
      priority: "CRITICAL",
      peopleTrapped: 5,
      hasInjuries: true,
      lat: 19.0680,
      lng: 72.8420,
      address: "Plot 42, Riverbank Society, Sector 3",
      needs: ["Boat Rescue", "Medical Attention", "Infant Care"],
      status: "Dispatched",
      assignedUnit: "NDRF Boat Squad Alpha",
      notes: "Ground floor completely submerged. Family on rooftop with 6-month-old baby."
    },
    {
      id: "sos-102",
      timestamp: "24 mins ago",
      name: "Anita Deshmukh",
      phone: "+91 98212 33441",
      priority: "HIGH",
      peopleTrapped: 2,
      hasInjuries: false,
      lat: 19.0950,
      lng: 72.8710,
      address: "B-204, Green Valley Heights, Sector 4",
      needs: ["Power Backup", "Insulin", "Drinking Water"],
      status: "Pending Dispatch",
      assignedUnit: "Unassigned",
      notes: "Elderly resident with diabetic condition. Power out for 14 hours."
    },
    {
      id: "sos-103",
      timestamp: "45 mins ago",
      name: "Karan Patel",
      phone: "+91 98215 55662",
      priority: "MEDIUM",
      peopleTrapped: 8,
      hasInjuries: false,
      lat: 19.0350,
      lng: 72.8350,
      address: "Old Mill Colony, Street 7",
      needs: ["Food Rations", "Evacuation Transport"],
      status: "In Progress",
      assignedUnit: "Civil Defense Transport 4",
      notes: "Water reached ankle level, road blocked by fallen branches."
    }
  ],

  missingPersons: [
    {
      id: "mp-1",
      name: "Aarav Gupta",
      age: 12,
      gender: "Male",
      lastSeenLocation: "Near St. Jude School during initial evacuation",
      lastSeenTime: "Yesterday 4:00 PM",
      contactPerson: "Sunita Gupta (Mother) - +91 98111 22334",
      status: "Missing",
      clothing: "Yellow raincoat, blue sneakers",
      notes: "Carrying a red backpack. Has mild asthma."
    },
    {
      id: "mp-2",
      name: "Dr. Arvind Rao",
      age: 68,
      gender: "Male",
      lastSeenLocation: "Sector 3 Community Clinic",
      lastSeenTime: "Today 8:00 AM",
      contactPerson: "Pooja Rao (Daughter) - +91 98222 44556",
      status: "Located in Shelter",
      clothing: "Grey formal shirt, spectacles",
      notes: "Located safely at St. Jude High School Relief Camp. Reunited pending road clearance."
    },
    {
      id: "mp-3",
      name: "Meera Sen",
      age: 29,
      gender: "Female",
      lastSeenLocation: "Bandra Coastal Promenade bus stop",
      lastSeenTime: "Yesterday 9:30 PM",
      contactPerson: "Rahul Sen (Husband) - +91 98333 77889",
      status: "Missing",
      clothing: "Green kurti and black umbrella",
      notes: "Phone switched off since 10:00 PM."
    }
  ],

  mitigationChecklist: [
    { id: "chk-1", title: "Clean Water Reserves", desc: "Minimum 3 liters per person per day for at least 72 hours", category: "Essential Survival", completed: true },
    { id: "chk-2", title: "Non-Perishable Food Pack", desc: "Ready-to-eat dry foods, energy bars, canned goods & manual opener", category: "Essential Survival", completed: true },
    { id: "chk-3", title: "Emergency First Aid & Prescription Medicines", desc: "Bandages, antiseptics, pain relievers, and 14-day supply of daily meds", category: "Medical", completed: false },
    { id: "chk-4", title: "Waterproof Documents Bag", desc: "National ID, property papers, insurance, medical records sealed in zip pouches", category: "Documentation", completed: false },
    { id: "chk-5", title: "Battery Radio & Power Banks", desc: "Hand-crank or battery AM/FM radio, charged portable battery banks & cables", category: "Communications", completed: true },
    { id: "chk-6", title: "Family Evacuation & Meeting Point Plan", desc: "Agreed-upon designated high-ground assembly point and out-of-town contact", category: "Planning", completed: false },
    { id: "chk-7", title: "Flashlights & Spare Whistles", desc: "LED flashlights, spare alkaline batteries, and acoustic whistles for signaling", category: "Rescue Tools", completed: false }
  ],

  volunteers: [
    { id: "vol-1", name: "Dr. Sameer Joshi", skill: "Medical / Trauma Care", phone: "+91 98901 22334", assignedZone: "Metro Sports Arena Shelter", status: "Active" },
    { id: "vol-2", name: "Vikram Singh", skill: "Inflatable Boat Pilot / Rescue", phone: "+91 98902 44556", assignedZone: "Sector 3 Riverfront Squad", status: "Active" },
    { id: "vol-3", name: "Neha Kulkarni", skill: "Food & Supply Logistics", phone: "+91 98903 66778", assignedZone: "St. Jude Camp Kitchen", status: "Active" }
  ],

  damageAssessments: [
    { id: "dmg-1", location: "Sector 3 Bridge Approach", type: "Infrastructure", severity: "Severe", estimatedRepair: "₹45 Lakhs / $55K", status: "Closed to Heavy Vehicles" },
    { id: "dmg-2", location: "Riverbank Residential Colony", type: "Residential", severity: "Submerged / Structural Weakening", estimatedRepair: "₹1.2 Crore / $145K", status: "Evacuation Complete" },
    { id: "dmg-3", location: "Substation 4 Transformer Yard", type: "Power Grid", severity: "Electrical Flooding", estimatedRepair: "₹25 Lakhs / $30K", status: "Isolated & Shut Down" }
  ],

  // 1. 'I Am Safe' Citizen Check-in Directory
  safeCheckins: [
    {
      id: "safe-1",
      name: "Suresh & Kavita Mehta",
      phone: "+91 98201 44556",
      currentLocation: "Metro Sports Arena Mega Shelter (Block B)",
      timestamp: "35 mins ago",
      status: "Safe & Sheltered",
      message: "We are both safe here with kids. Food and water available. Phone battery low.",
      familyContact: "Rohan Mehta (Son) - +91 98111 88990"
    },
    {
      id: "safe-2",
      name: "Priyanka Joshi",
      phone: "+91 98205 77889",
      currentLocation: "St. Jude High School Relief Camp",
      timestamp: "2 hours ago",
      status: "Safe & Sheltered",
      message: "Evacuated from Sector 3 by boat squad. Safe and receiving first aid.",
      familyContact: "Dr. Joshi - +91 98201 22334"
    },
    {
      id: "safe-3",
      name: "Devendra Verma & Family (4)",
      phone: "+91 98212 99001",
      currentLocation: "North Hilltop Community Civic Center",
      timestamp: "Today 10:15 AM",
      status: "Safe & Sheltered",
      message: "Staying on high ground at civic hall. Vehicle damaged but family unharmed.",
      familyContact: "Kunal Verma - +91 98333 11223"
    }
  ],

  // 3. Donation & Fundraising Gateway State
  fundraising: {
    targetAmount: 30000000,
    raisedAmount: 19450000,
    donorCount: 3842,
    reliefKitsFunded: 7780,
    recentDonations: [
      { donor: "Ratan P.", amount: 50000, time: "12 mins ago", type: "Financial" },
      { donor: "Anand M.", amount: 25000, time: "45 mins ago", type: "Financial" },
      { donor: "Community Seva Trust", amount: 100000, time: "2 hours ago", type: "Financial" }
    ],
    inKindDonations: [
      { item: "Clean Packaged Drinking Water", count: 48500, unit: "Liters", icon: "💧" },
      { item: "Ready-to-Eat Ration Packs", count: 14200, unit: "Packs", icon: "🍞" },
      { item: "Blankets & Clean Clothing", count: 9600, unit: "Sets", icon: "👕" },
      { item: "Emergency Medical & Hygiene Kits", count: 6800, unit: "Kits", icon: "🩹" }
    ]
  },

  // 5. Damage Assessment & Government Relief Claims
  damageClaims: [
    {
      id: "CLM-8921",
      applicantName: "Gopal Krishna Murthy",
      phone: "+91 98200 66778",
      propertyType: "Residential Ground Floor House",
      damageCategory: "Severe Flood Inundation & Structural Cracking",
      estimatedLoss: "₹6,80,000",
      reliefClaimed: "₹2,50,000 (Govt Compensation)",
      status: "Under Inspection",
      address: "House 18, Riverfront Enclave, Sector 3",
      dateFiled: "Today 11:30 AM",
      inspectorNotes: "Water level rose 3.2 meters. Flooring and electrical fixtures destroyed."
    },
    {
      id: "CLM-8922",
      applicantName: "Sunita Agro Mart (Sunita Deshmukh)",
      phone: "+91 98212 33441",
      propertyType: "Commercial Grocery Warehouse",
      damageCategory: "Stock Ruin & Water Contamination",
      estimatedLoss: "₹12,40,000",
      reliefClaimed: "₹5,00,000 (MSME Emergency Relief)",
      status: "Claim Approved",
      address: "Gala 4, Sector 4 Market Yard",
      dateFiled: "Yesterday 4:00 PM",
      inspectorNotes: "Inspection verified. Loss assessor sanctioned interim relief."
    },
    {
      id: "CLM-8923",
      applicantName: "Vikram Jadhav",
      phone: "+91 98219 88776",
      propertyType: "Private Vehicle (Four-Wheeler)",
      damageCategory: "Complete Submersion & Engine Seizure",
      estimatedLoss: "₹3,10,000",
      reliefClaimed: "₹1,80,000 (Motor Disaster Insurance)",
      status: "Disbursed",
      address: "Parking Basement 1, Green Valley Heights",
      dateFiled: "2 Days ago",
      inspectorNotes: "Total loss evaluation. Claim payment dispatched via DBT."
    }
  ],

  // 6. Mental Health & Trauma Support Resources
  mentalHealthResources: {
    helplines: [
      { name: "KIRAN National Mental Health Helpline", number: "1800-599-0019", hours: "24/7 Toll-Free", desc: "Psychological first aid in 13 regional languages" },
      { name: "Tele-MANAS National Crisis Support", number: "14416 / 1800-891-4416", hours: "24/7 Toll-Free", desc: "Government of India Comprehensive Mental Health Support" },
      { name: "NDMA Disaster PTSD Counseling Desk", number: "011-26701728", hours: "8:00 AM - 10:00 PM", desc: "Specialized crisis counseling for flood & cyclone survivors" }
    ],
    counselors: [
      { id: "cns-1", name: "Dr. Radhika Nair (MD, Psychiatry)", specialty: "Trauma & Acute Stress Management", hospital: "Memorial Coastal Health Center", status: "Available Today" },
      { id: "cns-2", name: "Dr. Alok Sen (Clinical Psychologist)", specialty: "Child & Family Grief Recovery", hospital: "City Trauma & General Hospital", status: "Available Today" },
      { id: "cns-3", name: "Pooja Banerjee (Crisis Counselor)", specialty: "Survivor Support & Anxiety Care", hospital: "Metro Sports Arena Relief Camp", status: "In-Person at Camp" }
    ],
    copingTips: [
      { title: "5-4-3-2-1 Sensory Grounding Technique", desc: "Acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste to halt acute anxiety." },
      { title: "Supporting Children After Evacuation", desc: "Keep routines predictable, listen to their fears without dismissal, and reassure them that rescue teams are keeping them safe." },
      { title: "Recognizing Normal Stress Responses", desc: "Insomnia, hypervigilance, and shock are natural bodily responses to severe disasters. Speak to counselors early." }
    ]
  },

  // 7. Offline Disaster GIS & Telemetry (Zero-Internet Fallbacks)
  offlineEarthquakes: [
    { id: "eq-off-1", place: "12 km WNW of Coastal Fault Line", mag: 4.8, depth: 10.4, time: "45 mins ago", alert: "orange", lat: 19.1200, lng: 72.7800 },
    { id: "eq-off-2", place: "Submarine Trench Seismic Rift", mag: 5.4, depth: 14.2, time: "2 hours ago", alert: "red", lat: 19.0400, lng: 72.7500 },
    { id: "eq-off-3", place: "Southern Estuary Tremor Zone", mag: 3.6, depth: 8.0, time: "3 hours ago", alert: "yellow", lat: 18.9800, lng: 72.8100 },
    { id: "eq-off-4", place: "River Basin Fault Rupture", mag: 4.1, depth: 12.5, time: "5 hours ago", alert: "orange", lat: 19.0800, lng: 72.8900 },
    { id: "eq-off-5", place: "Northern Ridge Bedrock Microquake", mag: 2.9, depth: 6.1, time: "8 hours ago", alert: "yellow", lat: 19.1450, lng: 72.8600 }
  ],

  offlineSectors: [
    {
      id: "sec-1",
      name: "Sector 1: Northern High Grounds (Safe Ridge)",
      status: "Safe / Evacuation Destination",
      color: "#10b981",
      coords: [[19.1050, 72.8450], [19.1350, 72.8450], [19.1350, 72.8900], [19.1050, 72.8900]]
    },
    {
      id: "sec-2",
      name: "Sector 2: Central Urban Hub & St. Jude Relief",
      status: "Moderate / Heavy Shelter Operations",
      color: "#3b82f6",
      coords: [[19.0750, 72.8400], [19.1050, 72.8400], [19.1050, 72.8750], [19.0750, 72.8750]]
    },
    {
      id: "sec-3",
      name: "Sector 3: River Basin Submersion (CRITICAL CODE RED)",
      status: "Flash Flooded / Mandatory Evacuation",
      color: "#ef4444",
      coords: [[19.0550, 72.8350], [19.0750, 72.8350], [19.0750, 72.8700], [19.0550, 72.8700]]
    },
    {
      id: "sec-4",
      name: "Sector 4: Eastern Waterlogged Plains",
      status: "Waterlogged / Power Cut",
      color: "#f59e0b",
      coords: [[19.0700, 72.8750], [19.1100, 72.8750], [19.1100, 72.9100], [19.0700, 72.9100]]
    },
    {
      id: "sec-5",
      name: "Sector 5: Coastal Surge Corridor",
      status: "High Tidal Waves (4.2m) / Storm Surge",
      color: "#dc2626",
      coords: [[19.0300, 72.8150], [19.0700, 72.8150], [19.0700, 72.8400], [19.0300, 72.8400]]
    }
  ]
};
