// Signal Desk glossary. Terms found in a call get a "?" the trainee can click.
// match: words to look for (longest match wins). cs: true = match exact capitalization (for acronyms).
// net: only use this entry on "wireless" or "fiber" calls (for terms that mean different things on each).
// ranges: [label, value, tone] where tone is good, warn or bad. Ranges are rules of thumb; edit them to fit your equipment.
window.SIGNAL_DESK_GLOSSARY = [
 { id:'rssi', name:'RSSI (received signal strength)', match:['RSSI'], cs:true,
   what:'How strong the radio signal from the tower is when it reaches the customer’s antenna, measured in dBm. The numbers are negative, and closer to zero is stronger: -55 is stronger than -75.',
   ranges:[['-50 to -65 dBm','Strong. Should support the full plan.','good'],['-66 to -72 dBm','Fair. Usually fine, with less headroom for bad weather or new obstructions.','warn'],['-73 to -80 dBm','Weak. Expect slowdowns and drops.','bad'],['Below -80 dBm','Unreliable. Needs realignment or a different mount or tower.','bad']],
   csat:'Weak signal causes slow speeds and dropped connections, the two complaints that drive customers to cancel most. Spotting weak RSSI early means you send a tech to fix the real cause instead of asking the customer to reboot again and again.',
   say:'“The signal reaching your antenna is weaker than it should be, so I’d like to send a technician to re-aim it and get you back to full speed.”' },

 { id:'dbm', name:'dBm (decibel-milliwatts)', match:['dBm'], cs:true,
   what:'The unit used for signal and light levels. It works on a log scale: every 3 dB is double or half the power, and 10 dB is ten times. Wireless signal (RSSI) and fiber light (Rx power) are both measured in dBm.',
   csat:'Small-looking changes in dBm are big changes in reality. A drop from -62 to -72 means the signal is ten times weaker, which customers feel as slowdowns or drops.',
   say:'“Your signal reading has dropped quite a bit, which explains what you’re seeing.”' },

 { id:'snr', name:'SNR (signal-to-noise ratio)', match:['SNR','signal-to-noise'], cs:true,
   what:'How much stronger the tower’s signal is than the background radio noise, in dB. A strong signal can still perform badly if the noise is also high.',
   ranges:[['30 dB and up','Excellent','good'],['25 to 29 dB','Good','good'],['15 to 24 dB','Fair. Speeds may vary.','warn'],['Below 15 dB','Poor. Expect lag, retransmits and drops.','bad']],
   csat:'Low SNR shows up as lag, buffering and video calls freezing, even when speed tests look fine. Customers find this maddening because it’s inconsistent. Escalating interference with the numbers gets it fixed for them and for their neighbors.',
   say:'“Your signal is strong, but there’s a lot of radio interference in your area. I’m sending this to our network team so they can move you to a cleaner channel.”' },

 { id:'noise', name:'Noise floor', match:['noise floor'],
   what:'The level of background radio energy on the channel, from other networks, devices and equipment. It’s measured in dBm, like signal. A noise floor of -90 is quiet; -72 is loud.',
   csat:'A rising noise floor quietly drags down everyone on a sector. Noticing it turns “my internet is laggy” complaints into a fix the NOC can make.',
   say:'“There’s more radio interference than normal near you, and that’s causing the lag.”' },

 { id:'cpe', name:'CPE (customer premises equipment)', match:['CPE'], cs:true,
   what:'The equipment at the customer’s home that connects to the network. On fixed wireless it’s the roof or eave radio. On fiber it’s usually called the ONT.',
   csat:'Whether the CPE is online is the first thing to check. It tells you in seconds whether the problem is your network, the customer’s equipment, or their home Wi-Fi, so the call is shorter and the fix is right.',
   say:'“I can see the equipment on your roof is offline, so let’s check its power first.”' },

 { id:'poe', name:'PoE injector', aka:'Power over Ethernet', match:['PoE injector','PoE','injector'],
   what:'A small power brick, usually indoors, that sends power and data to the roof radio over one Ethernet cable. It has a PoE port (to the radio) and a LAN port (to the router).',
   csat:'An unplugged or failed injector is one of the most common “internet is down” causes, and customers can usually check it themselves in a minute. Solving it on the call avoids a truck roll and a day of downtime.',
   say:'“There’s a small power adapter for the antenna, usually near your router. Can you check whether its light is on?”' },

 { id:'sector', name:'Sector', match:['sector'],
   what:'One antenna on a tower that serves a slice of the area around it, like a slice of pie. Every customer in that slice shares the sector’s capacity.',
   ranges:[['Under 70% at peak','Healthy','good'],['70 to 85% at peak','Busy','warn'],['Over 85% at peak','Congested. Evening slowdowns likely.','bad']],
   csat:'When a sector is overloaded, everyone on it slows down at the same time each evening. Recognizing the pattern stops CSRs from blaming the customer’s Wi-Fi and gets capacity added.',
   say:'“The equipment serving your area gets very busy in the evenings. I’m reporting it with your test results so our engineers can add capacity.”' },

 { id:'noc', name:'NOC (network operations center)', match:['NOC'], cs:true,
   what:'The team that monitors and manages the network: towers, fiber, outages, interference and capacity.',
   csat:'Good escalations to the NOC include the data (signal, tests, times). That gets problems fixed faster. Escalating things that aren’t network problems slows the NOC down for everyone.',
   say:'“I’m sending this to our network operations team with everything we found today.”' },

 { id:'los-sight', name:'Line of sight (LOS)', match:['line of sight','LOS'], net:'wireless',
   what:'A clear, unblocked path between the customer’s antenna and the tower. Fixed wireless needs it. Trees, buildings and hills in the way weaken or block the signal.',
   csat:'Loss of line of sight is often gradual (trees growing, leaves in spring) or sudden (a new building). It causes repeat calls until someone fixes the path, so catching it early saves the customer a lot of frustration.',
   say:'“Something may be blocking the path between your antenna and our tower. A technician can move or raise the antenna to get a clear view.”' },

 { id:'los-fiber', name:'LOS (loss of signal)', match:['LOS','loss of signal'], net:'fiber',
   what:'An alarm on the ONT meaning no light is arriving from the fiber network. It usually shows as a red light on the ONT.',
   csat:'One ONT in LOS usually means a loose or damaged cable at the home. Many ONTs in LOS at once means an outage. Telling them apart quickly means accurate answers and no wasted troubleshooting.',
   say:'“The red light means your fiber box isn’t receiving any light. Let’s check the cable going into it.”' },

 { id:'ont', name:'ONT (optical network terminal)', match:['ONT'], cs:true,
   what:'The fiber box at the customer’s home. It turns light from the fiber into an Ethernet connection for their router.',
   csat:'The ONT’s status and lights tell you whether the problem is the fiber, the power, or the customer’s router, which keeps the call short.',
   say:'“Can you look at the white fiber box and tell me which lights are on?”' },

 { id:'olt', name:'OLT (optical line terminal)', match:['OLT'], cs:true,
   what:'The equipment at the provider’s end that sends light down the fiber to many homes. Each OLT has PON ports, and each port serves a group of ONTs.',
   csat:'If many customers on one OLT port go down at once, it’s a network outage, not the customer’s equipment. Checking that first prevents pointless troubleshooting.',
   say:'“I’m checking whether others in your area are affected.”' },

 { id:'pon', name:'PON (passive optical network)', match:['PON'], cs:true,
   what:'The fiber design where one port on the OLT is split to serve many homes, often 32 or 64. Everyone on a PON port shares its capacity.',
   csat:'Comparing a customer with their PON neighbors is the fastest way to tell a home problem from a network problem.',
   say:'“Other homes on the same fiber line are online, so the issue is likely at your home. Let’s check your connection.”' },

 { id:'rx', name:'Rx optical power (fiber light level)', match:['Rx optical power','Rx power','optical power','light level'],
   what:'How much light reaches the customer’s ONT, in dBm. Closer to zero is stronger. Dirty connectors, tight bends and damage lower it.',
   ranges:[['-8 to -24 dBm','Normal','good'],['-25 to -27 dBm','Marginal. Watch for errors.','warn'],['Below -27 dBm','Failing. Expect drops; send a tech.','bad']],
   csat:'Light levels near the limit cause random drops that customers can’t explain and reboots won’t fix. Catching a falling level and sending a tech to clean or repair the fiber ends the repeat calls.',
   say:'“The light reaching your fiber box is lower than it should be. A technician can clean and test the connection.”' },

 { id:'fec', name:'FEC errors (forward error correction)', match:['FEC'], cs:true,
   what:'Errors the equipment had to correct on the fiber link. Rising FEC counts are an early warning that the light level or a connector is getting worse.',
   csat:'FEC errors often show up before the customer notices problems. Acting on them prevents an outage the customer would otherwise call about.',
   say:'“We’re seeing early signs of a problem on your line, so I’d like to have it checked before it causes drops.”' },

 { id:'gasp', name:'Dying gasp', match:['dying gasp'],
   what:'A last message an ONT or radio sends when it loses power. It tells you the device went offline because of power, not because of the network.',
   csat:'It points you straight to the outlet, breaker or battery backup, so you can solve the call fast without sending a tech.',
   say:'“Your fiber box reported losing power this morning. Let’s check the outlet it’s plugged into.”' },

 { id:'vlan', name:'VLAN tag', match:['VLAN'], cs:true,
   what:'A label some networks need on internet traffic from the customer’s router. If a customer’s own router doesn’t add the right VLAN tag, it won’t get an internet address.',
   csat:'Customers who bring their own routers get stuck here and blame the provider. Giving them the exact settings turns a frustrating call into a quick win.',
   say:'“Our network needs one setting on your router’s internet port. I’ll walk you through it.”' },

 { id:'dhcp', name:'DHCP and IP leases', match:['DHCP','lease'], cs:false,
   what:'DHCP hands out IP addresses automatically. A lease is how long a device keeps its address. A new router may not get an address while the old one still holds the lease.',
   csat:'Clearing an old lease fixes “I installed a new router and it doesn’t work” on the spot instead of making the customer wait a day.',
   say:'“Your old router is still holding the connection. I’ll release it so your new router can connect.”' },

 { id:'mac', name:'MAC address', match:['MAC'], cs:true,
   what:'A unique hardware ID for each network device. Some networks bind service to a device’s MAC address.',
   csat:'A MAC binding is a common reason a replacement router won’t connect. Clearing it is quick and avoids a truck roll.',
   say:'“Our system still recognizes your old router. I’ll update it for the new one.”' },

 { id:'cgnat', name:'CGNAT (carrier-grade NAT)', match:['CGNAT','carrier-grade NAT','100.64'], cs:false,
   what:'Many customers share one public IP address. Outgoing traffic works normally, but connections from the internet can’t reach devices in the home. Addresses starting with 100.64 are a sign of CGNAT.',
   csat:'Customers with cameras, game servers or remote access get stuck for hours trying port forwarding that can’t work. Explaining CGNAT and offering a public IP solves it and can be a paid add-on.',
   say:'“Your connection shares an internet address with other customers, so outside devices can’t reach your home directly. A public IP add-on fixes that.”' },

 { id:'publicip', name:'Public or static IP', match:['public IP','static IP'],
   what:'An internet address assigned just to this customer. A static IP doesn’t change. Needed for hosting, remote cameras and some business tools.',
   csat:'It’s the fix for CGNAT problems and often an upsell that solves a real need.',
   say:'“With a public IP add-on, your cameras and remote access will work from anywhere.”' },

 { id:'wan', name:'WAN port', match:['WAN'], cs:true,
   what:'The router port labeled Internet or WAN that connects to the provider’s equipment. Plugging into the wrong port is a common cause of “no internet.”',
   csat:'Checking cables and ports takes a minute on the phone and avoids a technician visit.',
   say:'“Look on the back of your router for the port marked Internet or WAN. That’s where the cable from the adapter goes.”' },

 { id:'lan', name:'LAN port', match:['LAN'], cs:true,
   what:'A port for local devices like computers. On a PoE injector, the LAN port goes to the router, and the PoE port goes to the roof radio.',
   csat:'Mixed-up LAN and PoE ports after a customer moves things around is an easy fix you can talk them through.',
   say:'“The cable from the adapter’s LAN port should go to your router’s Internet port.”' },

 { id:'mbps', name:'Mbps and Gbps', match:['Mbps','Gbps','meg','gig'],
   what:'Megabits and gigabits per second, the units for internet speed. 1 Gbps is 1,000 Mbps. Plans are measured wired; Wi-Fi is usually slower.',
   csat:'Customers judge their service by speed tests. Knowing what a test should show, and where (wired versus Wi-Fi), lets you set expectations honestly.',
   say:'“Your plan is measured on a wired connection. Phones and laptops on Wi-Fi usually see less.”' },

 { id:'latency', name:'Latency and ping', match:['latency','ping'],
   what:'How long data takes to make a round trip, in milliseconds (ms). Low, steady latency matters more than speed for gaming and video calls.',
   ranges:[['Under 30 ms','Great','good'],['30 to 60 ms','Fine for most uses','good'],['60 to 100 ms','Noticeable in games','warn'],['Spikes over 100 ms','Lag, freezing calls','bad']],
   csat:'Gamers and remote workers notice latency spikes long before slow speeds. Taking latency complaints seriously and checking for interference keeps these customers.',
   say:'“Your speed is fine, but the response time is jumping around. That’s what causes the lag, and I want our network team to look at it.”' },

 { id:'retrans', name:'Retransmits', match:['retransmits','retransmissions'],
   what:'Data the radio had to send again because it didn’t arrive cleanly. A high rate wastes capacity and causes lag.',
   ranges:[['Under 5%','Normal','good'],['5 to 10%','Watch it','warn'],['Over 10%','Problem: interference or a weak link','bad']],
   csat:'High retransmits make a connection feel sluggish even when speed tests look okay. They’re strong evidence to send to the NOC.',
   say:'“A lot of your data is having to be resent, which causes the lag. I’m passing this to our network team.”' },

 { id:'ghz', name:'Frequency bands (5 GHz, 60 GHz)', match:['60 GHz','5 GHz','GHz'],
   what:'The radio frequency a link uses. 5 GHz goes farther and handles weather well. 60 GHz is very fast over short distances but heavy rain absorbs it.',
   csat:'Knowing the link type explains weather-related drops honestly, and points to fixes like a 5 GHz fallback.',
   say:'“Your connection uses a very fast frequency that heavy rain can interrupt. We can add a backup link for storms.”' },

 { id:'fallback', name:'Fallback link', match:['fallback'],
   what:'A second, slower link that takes over automatically when the main one fails, such as a 5 GHz backup on a 60 GHz connection.',
   csat:'A fallback turns “my internet dies every storm” into a brief slowdown, which is a big difference in how the customer feels about the service.',
   say:'“We can set up a backup connection so you stay online during heavy rain.”' },

 { id:'wifi', name:'Wi-Fi vs. wired', match:['Wi-Fi','mesh'],
   what:'Wi-Fi speed drops with distance, walls and interference inside the home. A mesh system uses several units to cover a larger home.',
   csat:'Many “slow internet” calls are really weak Wi-Fi. Proving the line is fine and helping with Wi-Fi solves the real problem without blaming the network or the customer.',
   say:'“The connection into your home is running at full speed. The slowdown is the Wi-Fi reaching that room, and there are a few ways to fix that.”' },

 { id:'cat5e', name:'Ethernet cable types (Cat5, Cat5e, Cat6)', match:['Cat5e','Cat6','Cat5'],
   what:'Network cable grades. Old Cat5 or damaged cables can limit a connection to 100 Mbps. Cat5e or Cat6 supports gigabit speeds.',
   csat:'A $10 cable swap can turn a “you’re not giving me my gig” complaint into a happy customer.',
   say:'“Try the cable that came with your router. Older cables can cap your speed.”' },

 { id:'duplex', name:'Link speed and duplex', match:['full duplex','link speed','Linked at'],
   what:'The speed two devices agree on when connected by cable, like 100 Mbps or 1 Gbps. A test stuck near 94 Mbps means something is linking at 100.',
   csat:'Recognizing the 94 Mbps ceiling instantly points to a cable or port, which you can fix on the call.',
   say:'“Your computer is connecting at a lower speed setting, usually because of the cable. Let’s try another one.”' },

 { id:'drop', name:'Fiber drop', match:['temporary drop','temporary drops','drop line','Drop type'],
   what:'The fiber cable from the street to the home. A temporary drop may lie on the ground until a crew buries it.',
   csat:'An unburied drop is a daily reminder of unfinished work. Owning the follow-up and giving a real date protects the relationship.',
   say:'“The cable on your lawn is temporary. I’ll get you a date for when the crew will bury it.”' },

 { id:'splice', name:'Splicing', match:['splice','splicing'],
   what:'Joining fiber strands back together after a cut. It’s precise work and can take hours, depending on how many fibers were cut.',
   csat:'Customers want a time. Explaining honestly that splicing takes hours, without promising a time, avoids broken promises and second angry calls.',
   say:'“A crew is repairing the cut fiber now. It’s detailed work, so I can’t promise an exact time, but we’ll send updates.”' },

 { id:'811', name:'811 (call before you dig)', match:['811'],
   what:'The free national number that arranges for buried utilities to be marked before digging.',
   csat:'Telling customers to call 811 protects them and the service. A cut drop means an outage and a repair visit.',
   say:'“Before you dig, call 811. It’s free, and they’ll mark where all the buried lines are.”' },

 { id:'prorate', name:'Proration', match:['prorated','proration'],
   what:'A partial charge for part of a billing period, for example after a mid-month plan change.',
   csat:'Prorated charges look like double billing to customers. A clear explanation prevents a refund request and a repeat call next month.',
   say:'“Because you upgraded mid-month, this bill includes a partial charge for those days plus your new monthly rate.”' },

 { id:'porting', name:'Number porting', match:['port request','porting','the port completes'],
   what:'Moving a customer’s phone number from their old provider to yours. The old service must stay active until the port finishes.',
   csat:'If the customer cancels too early, they can lose their number. Getting this right avoids a serious and lasting complaint.',
   say:'“Keep your old phone service active until we tell you the transfer is complete, so your number is protected.”' },

 { id:'truckroll', name:'Truck roll', match:['truck roll'],
   what:'Sending a technician to the customer’s home. It costs the company money and the customer time.',
   csat:'Solving what you can on the phone saves the customer waiting for an appointment. Sending a tech when it’s truly needed fixes the problem the first time.',
   say:'“I’d like to try one quick thing first. If that doesn’t work, I’ll schedule a technician.”' },

 { id:'csat', name:'CSAT (customer satisfaction)', match:['CSAT'], cs:true,
   what:'A score for how satisfied customers are. In this game it controls growth: high CSAT brings sign-ups, low CSAT makes customers leave.',
   csat:'Every call moves it. Accurate answers, honest timelines and solving issues on the first call raise it the most.',
   say:'' },

 { id:'congestion', name:'Congestion', match:['congestion','congested','overloaded'],
   what:'When more people want to use a sector or link than it has capacity for, so everyone slows down, usually in the evening.',
   csat:'Congestion causes predictable evening slowdowns. Customers stay patient when you acknowledge the pattern and escalate with evidence.',
   say:'“Your area’s equipment gets overloaded in the evenings. I’m reporting it so we can add capacity.”' },

 { id:'interference', name:'Interference', match:['interference'],
   what:'Unwanted radio signals on the same channel, from other networks or equipment. It raises the noise floor and lowers SNR.',
   csat:'Interference causes lag and drops that look random to customers. Escalating it with numbers gets a channel change that helps everyone nearby.',
   say:'“There’s radio interference near you. Our network team can move you to a cleaner channel.”' },

 { id:'align', name:'Alignment', match:['realignment','realign','alignment'],
   what:'Aiming the customer’s antenna precisely at the tower. Small changes in aim make a big difference to signal.',
   csat:'Alignment needs tools and safe roof access. Keeping customers off the roof and sending a tech protects them and fixes the signal properly.',
   say:'“Please don’t climb up. A technician will re-aim the antenna with the right tools.”' },

 { id:'grounding', name:'Grounding', match:['grounding'],
   what:'Connecting outdoor equipment to earth so lightning surges have a safe path. Poor grounding means storms can damage equipment again.',
   csat:'Fixing grounding after a lightning strike stops the next storm from causing the same outage.',
   say:'“The technician will replace the damaged parts and check the grounding so this is less likely to happen again.”' },

 { id:'firmware', name:'Firmware upgrade', match:['firmware'],
   what:'A software update for network equipment, usually done during a late-night maintenance window.',
   csat:'Customers who notice brief overnight drops feel better when you explain the planned maintenance and offer notices.',
   say:'“We did planned maintenance overnight, which caused a short interruption. I can sign you up for advance notices.”' },

 { id:'speedtest', name:'Speed test', match:['speed test','speed tests'],
   what:'A measurement of download and upload speed. Results depend on where it’s run: wired at the router shows the line; Wi-Fi in a far room shows the Wi-Fi.',
   csat:'Comparing a radio or wired test with the customer’s test is how you find the real bottleneck without blaming anyone.',
   say:'“Could you run the test on a computer plugged into the router? That tells us whether it’s the connection or the Wi-Fi.”' },

 { id:'phishing', name:'Phishing', match:['phishing'],
   what:'Fake emails, texts or calls that pretend to be from the provider to steal passwords or card numbers.',
   csat:'Customers trust you more when you protect them. Clear advice and checking their account turns a scary moment into reassurance.',
   say:'“That message isn’t from us. We never ask for your password. Please don’t click it; I’ll check your account is safe.”' },

 { id:'survey', name:'Site survey', match:['site survey'],
   what:'A visit or remote check to confirm a location has a clear path to a tower before installing.',
   csat:'A survey avoids promising service that can’t be delivered and wasting an install appointment.',
   say:'“Service depends on a clear view to our tower, so the first step is a quick site survey.”' },
];
