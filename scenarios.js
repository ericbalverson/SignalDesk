// Signal Desk scenario bank. Edit, remove or add coaching calls here.
// Each call: id (unique), topic, caller, plan, quote, data [[label, value]...],
// options (exactly 4), and a one-line lesson shown after the answer.
// s: 2 = best practice, 1 = acceptable but incomplete, 0 = wrong
const SCENARIOS = [
 { id:'poe', topic:'Connectivity', caller:'Dana R.', plan:'50/10 Mbps',
   quote:'Nothing works. The router lights are on but no websites load.',
   data:[['CPE status','OFFLINE since 7:42 AM'],['Last signal','-61 dBm / SNR 32 dB'],['Sector','Ridge-3 B · UP'],['Neighbors','38 of 38 online'],['Account','Current']],
   options:[
    {t:'Have them find the PoE injector (the power brick for the roof radio), check its light, and try a known-good outlet.', s:2, why:'The radio is offline while the sector and neighbors are fine, so the fault is local power. The injector is the most common cause and takes a minute to check.'},
    {t:'Tell them the tower is having trouble and to wait a few hours.', s:0, why:'Monitoring shows the sector up with every neighbor online. That answer is inaccurate and leaves them down.'},
    {t:'Schedule a technician for tomorrow.', s:1, why:'It may fix it, but it costs a truck roll and a day offline for something the customer can probably fix now.'},
    {t:'Walk them through a factory reset of their router.', s:0, why:'The radio itself is offline, not the router. A reset wipes their Wi-Fi settings and creates a second problem.'}],
   lesson:'CPE offline + sector up + neighbors online = check power first: injector light, outlet, cable seating.' },

 { id:'wifi', topic:'Speed', caller:'Marcus T.', plan:'50/10 Mbps',
   quote:'I pay for 50 meg and I am getting 12. This is a joke.',
   data:[['Signal','-58 dBm / SNR 34 dB'],['Radio speed test','49.6 / 9.8 Mbps'],['Customer test','12.1 Mbps · Wi-Fi, back bedroom'],['Sector load','41%']],
   options:[
    {t:'Explain the radio is delivering full speed to the house, then have them test near the router or wired and talk through router placement or mesh.', s:2, why:'The radio test proves the network is delivering the plan. The gap is inside the home, almost always Wi-Fi range.'},
    {t:'Escalate to the NOC as a network speed problem.', s:0, why:'The data already shows the network is fine. This wastes NOC time and the customer still has slow Wi-Fi.'},
    {t:'Power cycle the radio and router and test again.', s:1, why:'Harmless, but it does not address the cause and the bedroom will still be slow.'},
    {t:'Offer an upgrade to the 100 Mbps plan.', s:0, why:'More plan speed will not reach a bedroom with weak Wi-Fi. They pay more and stay unhappy.'}],
   lesson:'Compare the radio\'s own speed test to the customer\'s. Full speed at the radio means the bottleneck is inside the home.' },

 { id:'congest', topic:'Speed', caller:'Priya S.', plan:'50/10 Mbps',
   quote:'Every night from about 7 to 11 everything buffers. Mornings are perfect.',
   data:[['Signal','-63 dBm / SNR 31 dB'],['Sector peak load','96% (7-11 PM)'],['Wired test at 8 PM','14 / 6 Mbps'],['Sector tickets this week','6']],
   options:[
    {t:'Acknowledge the pattern, explain the sector is congested at peak hours, and escalate to the network team with the load data and their wired test.', s:2, why:'Good signal, a wired test and a sector at 96% at peak point to capacity. Engineering needs the evidence to split or upgrade the sector.'},
    {t:'Tell them it is their Wi-Fi.', s:0, why:'Their wired test rules out Wi-Fi. Blaming the customer here damages trust.'},
    {t:'Credit their account and close the ticket.', s:1, why:'Goodwill helps, but nothing changes and they will call again next week.'},
    {t:'Suggest they stream less in the evening.', s:0, why:'Asking customers to use less of what they pay for is not a fix.'}],
   lesson:'Time-of-day slowdowns with good signal and a busy sector mean capacity. Gather data and escalate.' },

 { id:'trees', topic:'Signal & LOS', caller:'Hank W.', plan:'25/5 Mbps',
   quote:'It drops all the time now. Started sometime around April.',
   data:[['Signal history','Jan -60 → May -75 dBm'],['SNR now','15 dB'],['Install','2023 · eave mount'],['Site notes','Oak trees west of house']],
   options:[
    {t:'Explain that new leaves in the signal path can weaken it, and schedule a tech to realign or raise the mount for clear line of sight.', s:2, why:'A steady decline starting in spring with trees on the path is classic foliage loss. It needs a site visit.'},
    {t:'Have them power cycle the radio whenever it drops.', s:0, why:'Reboots do nothing for a blocked path. They will keep dropping all summer.'},
    {t:'Ask them to trim the trees and call back.', s:1, why:'It might help, but it puts the work and the risk on the customer. Let a tech assess first.'},
    {t:'Tell them wireless is just unreliable.', s:0, why:'This is a known, fixable problem. That answer loses the customer.'}],
   lesson:'Fixed wireless needs clear line of sight. A gradual spring decline usually means foliage.' },

 { id:'outage', topic:'Outages', caller:'Rosa M.', plan:'100/20 Mbps',
   quote:'Is the internet down? My neighbor is out too.',
   data:[['Tower','Hilltop-1 · DOWN (power) since 2:05 PM'],['NOC ticket','Open · crew en route'],['Affected subscribers','212'],['Customer CPE','Offline']],
   options:[
    {t:'Confirm the known outage, share what you know without promising a fix time, note their account, and tell them how updates will reach them.', s:2, why:'They get the truth, a record of the call, and a way to stay informed, without a promise you cannot keep.'},
    {t:'Walk them through rebooting the radio and router.', s:0, why:'The tower is down. Troubleshooting their gear wastes their time and yours.'},
    {t:'Promise it will be back in 30 minutes.', s:0, why:'Nobody knows that yet. A missed promise turns one angry call into two.'},
    {t:'Tell them it is an outage and end the call.', s:1, why:'Accurate, but there is no note on the account and no path for updates.'}],
   lesson:'In a confirmed outage: confirm, log, set honest expectations, explain updates. Do not troubleshoot their equipment.' },

 { id:'lightning', topic:'Safety', caller:'Glen P.', plan:'25/5 Mbps',
   quote:'Big storm last night. Nothing works and the little box smells burnt.',
   data:[['CPE status','OFFLINE since 11:48 PM'],['Lightning in area','11:45 PM'],['Neighbors','Online'],['Account','Current']],
   options:[
    {t:'Have them unplug the injector and stay off the roof, then schedule a tech with a replacement radio and injector plus a grounding check.', s:2, why:'Safety comes first. A surge often kills both radio and injector, and poor grounding means it can happen again.'},
    {t:'Have them climb up and reseat the cable on the radio.', s:0, why:'Never send a customer onto a roof, especially near possibly damaged electrical equipment.'},
    {t:'Mail them a new PoE injector.', s:1, why:'The radio may also be damaged and nobody checks the grounding.'},
    {t:'Have them keep power cycling it.', s:0, why:'A burnt smell means damaged hardware. Keeping it plugged in is a hazard.'}],
   lesson:'Burnt smell or storm damage: unplug, stay off the roof, send a tech with replacement gear, check grounding.' },

 { id:'suspend', topic:'Billing', caller:'Linda K.', plan:'50/10 Mbps',
   quote:'You cut off my internet! I have been with you six years!',
   data:[['Status','Suspended · non-payment, 3 days'],['Balance','$134.98'],['Autopay card','Expired 08/26'],['Reminders sent','2 emails']],
   options:[
    {t:'Acknowledge their frustration and loyalty, explain the autopay card expired, offer to update it and take payment, and confirm when service returns.', s:2, why:'Empathy first, a plain explanation, and the fastest path back online.'},
    {t:'Tell them it is their fault for not updating the card.', s:0, why:'True or not, blame escalates the call and does not get them online.'},
    {t:'Restore service without collecting payment.', s:1, why:'Kind, but it skips the actual fix. Only do this if your policy allows a courtesy restore.'},
    {t:'Transfer them to billing without explaining.', s:0, why:'They have to tell the story again to someone else. You had everything needed to solve it.'}],
   lesson:'Lead with empathy, explain the cause plainly, give the fastest path back online.' },

 { id:'coverage', topic:'Sales', caller:'Owen B.', plan:'Prospect',
   quote:'Can I get your service at 418 Pine Hollow Road?',
   data:[['Coverage map','Fringe of Ridge-3 sector'],['Terrain','Wooded valley'],['Nearest customer','0.8 mi']],
   options:[
    {t:'Explain service depends on line of sight, check the address in the coverage tool, and offer a site survey before promising service.', s:2, why:'Maps are estimates. A survey avoids a failed install and a disappointed customer.'},
    {t:'Sign them up and book the install now. The map shows coverage.', s:0, why:'Fringe plus woods often means no line of sight. A failed install wastes a truck roll.'},
    {t:'Tell them wooded areas never work.', s:0, why:'Many do, with a taller mount or a different tower. You may lose a good customer.'},
    {t:'Ask them to check with neighbors and call back.', s:1, why:'Neighbors help, but you have better tools and the lead may not come back.'}],
   lesson:'For fringe or wooded addresses, promise a site survey, not service.' },

 { id:'ports', topic:'Equipment', caller:'Tasha L.', plan:'50/10 Mbps',
   quote:'I rearranged my office and now there is no internet at all.',
   data:[['CPE status','OFFLINE since 3:10 PM'],['Customer reports','Injector light ON'],['Router','WAN shows no link']],
   options:[
    {t:'Have them trace the cables: roof cable into the injector\'s PoE port, injector\'s LAN port into the router\'s WAN/Internet port.', s:2, why:'It went down right after they moved things. Swapped cables are the usual cause and easy to fix on the call.'},
    {t:'Schedule a tech to replace the radio.', s:0, why:'Nothing points to a failed radio. Check the simple change they just made first.'},
    {t:'Ask them to reboot everything.', s:1, why:'Will not help if the cables are in the wrong ports.'},
    {t:'Tell them moving equipment voids support.', s:0, why:'Not true and not helpful.'}],
   lesson:'After a customer moves equipment, check cabling first: roof cable to PoE, LAN to router WAN.' },

 { id:'router', topic:'Equipment', caller:'Ben A.', plan:'100/20 Mbps',
   quote:'I bought a new router and it just says no internet.',
   data:[['CPE status','Online · -60 dBm'],['DHCP lease','Bound to old router MAC (24 h)'],['New router MAC','Not seen']],
   options:[
    {t:'Confirm the router\'s WAN is set to automatic (DHCP), clear the old lease or binding, and have them power cycle the radio and router.', s:2, why:'The radio is fine. The new router is not getting an address because the old one still holds the lease.'},
    {t:'Tell them only company routers are allowed.', s:0, why:'Most WISPs allow customer routers. Check policy before refusing.'},
    {t:'Tell them to wait 24 hours for the lease to expire.', s:1, why:'It will work eventually, but they are offline for a day when you could fix it now.'},
    {t:'Schedule a technician.', s:0, why:'A truck roll for a lease you can clear from the office.'}],
   lesson:'New router, radio online: check WAN settings and clear the old lease or MAC binding.' },

 { id:'cgnat', topic:'Network', caller:'Sam D.', plan:'25/5 Mbps',
   quote:'My security camera app cannot connect when I am away from home.',
   data:[['WAN IP','100.64.18.42 (CGNAT)'],['Plan','Residential'],['Static IP add-on','$10/mo']],
   options:[
    {t:'Explain their connection shares a public IP (CGNAT) so inbound connections cannot reach the home, and offer the public IP add-on or the camera\'s cloud mode.', s:2, why:'100.64.x.x addresses are carrier-grade NAT. They need a public IP or a cloud relay.'},
    {t:'Tell them to set up port forwarding on their router.', s:0, why:'Port forwarding does nothing behind CGNAT. They will waste hours.'},
    {t:'Escalate to the NOC as an outage.', s:0, why:'Their internet works. This is how the service is provisioned.'},
    {t:'Tell them cameras are not supported.', s:1, why:'Not wrong, but there are real options you can offer.'}],
   lesson:'100.64.x.x is CGNAT. Inbound access needs a public IP or a cloud relay.' },

 { id:'verify', topic:'Security', caller:'Unverified caller', plan:'50/10 Mbps',
   quote:'I need to change the email on my partner\'s account. They are at work.',
   data:[['Account holder','J. Alvarez'],['Authorized users','None'],['Verification','Caller could not give account PIN'],['Caller knows','Service address, plan']],
   options:[
    {t:'Politely explain you can only change details for the account holder or an authorized user, and explain how the holder can call or add them.', s:2, why:'Protects the customer and still gives the caller a clear way forward.'},
    {t:'Make the change, since they know the address and plan.', s:0, why:'An address and plan are easy to find. This is how account takeovers happen.'},
    {t:'Read them the current email so they can confirm it.', s:0, why:'That discloses private account data to an unverified caller.'},
    {t:'Tell them the holder has to call and end the call.', s:1, why:'Correct refusal, but you could have explained how to add them as an authorized user.'}],
   lesson:'Never change or disclose account details without verification. Knowing an address is not verification.' },

 { id:'noise', topic:'Signal & LOS', caller:'Kai N.', plan:'100/20 Mbps',
   quote:'My games lag terribly. Ping jumps to 300 ms.',
   data:[['Signal','-59 dBm'],['Noise floor','-72 dBm → SNR 13 dB'],['Retransmits','18%'],['Wired test','47/9 Mbps · 28-310 ms']],
   options:[
    {t:'Note that signal is strong but noise is high, and escalate to the NOC for an interference and frequency review with these stats.', s:2, why:'Strong signal with a high noise floor and heavy retransmits points to interference the NOC can address.'},
    {t:'Recommend a gaming router.', s:0, why:'The wired test already shows the spikes. A new router will not touch RF interference.'},
    {t:'Reboot the radio and see if it improves.', s:1, why:'May briefly help, but the noise will be back.'},
    {t:'Tell them latency is not covered by the plan.', s:0, why:'Dismissive, and there is a real fixable cause in the data.'}],
   lesson:'Strong signal is not enough. Low SNR plus retransmits means interference: escalate with the numbers.' },

 { id:'upsell', topic:'Sales', caller:'Erin C.', plan:'50/10 Mbps',
   quote:'I want the 200 meg plan.',
   data:[['CPE','Older 5 GHz model · max ~100 Mbps'],['Signal','-77 dBm / SNR 18 dB'],['Tower','Ridge-3 · supports 300 Mbps']],
   options:[
    {t:'Explain their radio and signal cannot deliver 200 Mbps, and offer a tech visit to install newer equipment and align it, then upgrade.', s:2, why:'Sets honest expectations and still closes the sale the right way.'},
    {t:'Change the plan now and bill the higher rate.', s:0, why:'They will pay for speed they never get, then call angry.'},
    {t:'Tell them 200 Mbps is not possible on wireless.', s:0, why:'The tower supports it. You turned away a sale.'},
    {t:'Upgrade them to 100 Mbps since that is the radio\'s max.', s:1, why:'Closer, but at -77 dBm they may not reach 100 either.'}],
   lesson:'Check equipment and signal before selling an upgrade.' },

 { id:'roof', topic:'Safety', caller:'Walt J.', plan:'25/5 Mbps',
   quote:'I will just get on the roof and turn the dish myself. Which way?',
   data:[['Signal','-74 dBm (was -62 at install)'],['Home','2-story, steep roof']],
   options:[
    {t:'Ask them not to climb; have them check from the ground for anything new blocking the view, and schedule a tech realignment.', s:2, why:'Keeps them safe and still gathers useful information before the visit.'},
    {t:'Tell them to point it roughly northeast.', s:0, why:'Encourages a dangerous climb and they will likely make alignment worse.'},
    {t:'Have them loosen the bracket and sweep slowly while you watch signal.', s:0, why:'Remote-guided alignment from a steep roof is a serious fall risk.'},
    {t:'Ask them not to climb and end the call.', s:1, why:'Safe, but nothing gets fixed.'}],
   lesson:'Customers never climb to adjust equipment. Ground observations help; alignment is a tech job.' },

 { id:'repeat', topic:'Escalation', caller:'Carla F.', plan:'100/20 Mbps',
   quote:'This is the third outage this month. I want a manager.',
   data:[['Tickets, 30 days','3 (2 tower power, 1 CPE)'],['Credits applied','None'],['Hilltop-1','2 power failures this month']],
   options:[
    {t:'Acknowledge the pattern, summarize what happened, apply an outage credit per policy, escalate the tower power issue, and offer the manager callback.', s:2, why:'Shows you understand the history, does what you are empowered to do, and fixes the root cause.'},
    {t:'Tell them outages happen and there is nothing you can do.', s:0, why:'Dismissive, and there is a real recurring tower problem to escalate.'},
    {t:'Transfer to a manager immediately.', s:1, why:'Meets the request, but you could have solved most of it yourself.'},
    {t:'Offer a large discount so they do not leave.', s:0, why:'Exceeds normal authority and does not fix the tower.'}],
   lesson:'Own it: show you know the history, act within your authority, escalate root cause, then offer escalation.' },

 { id:'rain', topic:'Outages', caller:'Noor H.', plan:'300/50 Mbps',
   quote:'When it pours, my internet cuts out. Then it comes right back.',
   data:[['Link type','60 GHz short-range'],['Drops','Match rain over 25 mm/hr'],['5 GHz fallback','Not configured']],
   options:[
    {t:'Explain heavy rain absorbs very high frequencies like 60 GHz, then escalate to engineering to configure the 5 GHz fallback.', s:2, why:'Explains the cause and gets the fix that keeps them online in storms.'},
    {t:'Tell them to wipe the water off the dish.', s:0, why:'Rain in the air path is the problem, and they should not be on the roof.'},
    {t:'Tell them it is weather and nothing can be done.', s:1, why:'Correct cause, but a fallback link is available.'},
    {t:'Send a tech to replace the radio.', s:0, why:'The radio works. The frequency is the issue.'}],
   lesson:'Rain affects 60 GHz far more than 5 GHz. Know the link type; a fallback link may fix it.' },
];
