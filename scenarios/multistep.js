// Signal Desk multi-step calls. Each step reveals what happened after the best action on the step before.
// A step can add 'say' (what the customer says or what you find) and 'data' (new rows for the account panel).
(window.SIGNAL_DESK_SCENARIOS ||= []).push(
 { id:'m-w-dead', net:'wireless', topic:'Connectivity', plan:'50/10 Mbps',
   quotes:['My internet’s been dead since last night.',
           'Nothing’s working, and I already rebooted everything.',
           'No internet at all. I need it for work tomorrow.'],
   data:[['CPE status','OFFLINE since 9:15 PM'],['Sector','Ridge-3 A · UP'],['Neighbors','41 of 41 online']],
   steps:[
    { options:[
      {t:'Have them check the PoE injector light and the outlet it’s plugged into.', s:2, why:'Radio offline with a healthy sector points to power at the home first.'},
      {t:'Tell them there’s an outage in their area.', s:0, why:'Every neighbor is online.'},
      {t:'Schedule a technician for tomorrow to check the radio and cabling.', s:1, why:'Possible later, but check the quick fix first.'},
      {t:'Walk them through a factory reset of their router.', s:0, why:'The radio is offline, not the router.'}]},
    { say:'Customer: “The injector light is on. Oh, the painters were on the roof yesterday.”',
      data:[['Injector','Light ON (customer)']],
      options:[
      {t:'Have them climb up and check the cable at the radio.', s:0, why:'Never send a customer onto the roof.'},
      {t:'Explain the roof cable may have been knocked loose, ask them not to climb, and book a tech.', s:2, why:'Power is fine and something physical changed on the roof. That needs a tech.'},
      {t:'Have them unplug the injector for a minute, plug it back in, and repeat if it doesn’t come up.', s:1, why:'Unlikely to help if the cable was damaged or unplugged.'},
      {t:'Tell them painters couldn’t affect the internet.', s:0, why:'Work near the radio is a common cause of damage.'}]},
    { say:'Customer: “Ugh. When can someone come? I work from home.”',
      data:[['Next appointment','Tomorrow 8-12'],['Cancellation list','Available']],
      options:[
      {t:'Promise a tech within the hour to calm them down.', s:0, why:'You can’t confirm that. A broken promise makes it worse.'},
      {t:'Book tomorrow’s 8 to 12 slot, confirm the address, and end the call.', s:1, why:'Gets it scheduled, but misses the chance for an earlier visit.'},
      {t:'Tell them to expect someone sometime this week.', s:0, why:'Vague timing frustrates someone who works from home.'},
      {t:'Book the earliest slot and add them to the cancellation list.', s:2, why:'Honest timing plus a real chance at a sooner visit.'}]}],
   lesson:'Work the problem in order: power, then physical changes, then a clear appointment with honest timing.' },

 { id:'m-w-evening', net:'wireless', topic:'Speed', plan:'50/10 Mbps',
   quotes:['It’s slow every night.',
           'Evenings have been terrible lately.',
           'After dinner my internet crawls.'],
   data:[['CPE status','Online'],['Plan','50/10 Mbps']],
   steps:[
    { options:[
      {t:'Tell them it’s probably their router.', s:0, why:'No evidence yet. Guessing blames the customer.'},
      {t:'Pull up the radio’s signal and the sector’s load history before guessing.', s:2, why:'The data tells you whether it’s signal, capacity or the home.'},
      {t:'Reboot the radio remotely and ask them to call back if tonight is still slow.', s:1, why:'Might help briefly, but you still don’t know the cause.'},
      {t:'Give them a credit and close the ticket.', s:0, why:'Nothing gets fixed.'}]},
    { say:'Signal is -62 dBm with 30 dB SNR. Sector Ridge-3 B peaks at 95% from 7 to 11 PM.',
      data:[['Signal','-62 dBm / SNR 30 dB'],['Sector peak','95% (7-11 PM)']],
      options:[
      {t:'Tell them their signal is weak and book a realignment.', s:0, why:'The signal is good. A realignment won’t help.'},
      {t:'Tell them the sector is busy at night and that engineering is aware.', s:1, why:'Likely right, but you need a wired test to prove it.'},
      {t:'Ask them to run a wired speed test tonight during the slow time.', s:2, why:'A wired test at peak rules out Wi-Fi and gives engineering evidence.'},
      {t:'Recommend they buy a mesh Wi-Fi system.', s:0, why:'Doesn’t address a busy sector.'}]},
    { say:'Next day: their wired test at 8:30 PM was 13 / 5 Mbps.',
      data:[['Wired test 8:30 PM','13 / 5 Mbps']],
      options:[
      {t:'Escalate to engineering with the load data and test, and share the ticket number.', s:2, why:'Evidence-backed escalation, and the customer can follow up.'},
      {t:'Tell them evenings are always slower on wireless.', s:0, why:'95% load is a capacity problem engineering can fix.'},
      {t:'Apply a credit for the slow evenings and ask them to call back if it continues next week.', s:1, why:'Goodwill, but no fix is in motion.'},
      {t:'Move them to a cheaper plan.', s:0, why:'Lowers revenue and doesn’t fix anything.'}]}],
   lesson:'Gather data before guessing, prove it with a wired peak-time test, then escalate with evidence.' },

 { id:'m-f-slow', net:'fiber', topic:'Speed', plan:'1 Gbps',
   quotes:['I pay for a gig and it’s slow everywhere.',
           'My speeds are way under what I’m paying for.',
           'Fiber is supposed to be fast. Mine isn’t.'],
   data:[['ONT','Online · Rx -18.7 dBm'],['Customer test','180 Mbps on phone']],
   steps:[
    { options:[
      {t:'Escalate to the NOC for a speed problem.', s:0, why:'One phone test isn’t evidence of a network problem.'},
      {t:'Reboot the ONT remotely and ask them to test again.', s:1, why:'Harmless, but a phone on Wi-Fi still won’t show the line speed.'},
      {t:'Ask them to test on a computer wired to the router.', s:2, why:'A wired test separates the line from the Wi-Fi.'},
      {t:'Offer a technician visit right away.', s:0, why:'Too early. You don’t know what’s wrong yet.'}]},
    { say:'Wired laptop test: 93 Mbps down, 92 up.',
      data:[['Wired test','93 / 92 Mbps']],
      options:[
      {t:'Tell them the fiber line must be damaged.', s:0, why:'Light levels are good. A 93 ceiling points to a 100 Mbps link.'},
      {t:'Have them try a different Ethernet cable and router port.', s:2, why:'A ceiling just under 100 is the classic sign of an old cable or port.'},
      {t:'Have them try a different speed test website to compare.', s:1, why:'Won’t change a link-speed ceiling.'},
      {t:'Tell them 93 is close enough for normal use.', s:0, why:'They pay for a gig and there’s a simple fix.'}]},
    { say:'They swap an old flat cable for the one that came with the router: 936 / 921 Mbps. “Great, but my phone still only gets 300.”',
      data:[['Wired retest','936 / 921 Mbps']],
      options:[
      {t:'Open a ticket because the phone should get a full gig.', s:0, why:'Phones on Wi-Fi rarely reach a gig.'},
      {t:'Tell them the line is working and Wi-Fi speeds are outside what support covers.', s:1, why:'Policy may say so, but a short explanation prevents a repeat call.'},
      {t:'Explain phones on Wi-Fi rarely reach a gig, and share a few Wi-Fi tips.', s:2, why:'Sets realistic expectations and leaves them with something useful.'},
      {t:'Sell them the 2 Gbps plan to fix the phone speed.', s:0, why:'A faster plan won’t change the phone’s Wi-Fi limit.'}]}],
   lesson:'Test wired first, watch for a 94 Mbps ceiling, and set realistic Wi-Fi expectations.' },

 { id:'m-f-out', net:'fiber', topic:'Outages', plan:'500/500 Mbps',
   quotes:['Red light on the fiber box. I work from home and have a meeting at noon!',
           'The internet just died and my box has a red light. I have a call soon.',
           'My fiber box is red. I need internet for a meeting in an hour.'],
   data:[['ONT status','LOS since 10:42 AM']],
   steps:[
    { options:[
      {t:'Check the PON port to see whether other ONTs are down too.', s:2, why:'One look tells you if it’s their home or a plant outage.'},
      {t:'Have them unplug and reseat the fiber several times.', s:0, why:'Risky handling before you know the cause.'},
      {t:'Book a technician to check the ONT tomorrow.', s:1, why:'May not be needed if it’s a wider outage.'},
      {t:'Tell them it’s probably their router.', s:0, why:'A red LOS light means no light at the ONT, not a router problem.'}]},
    { say:'PON 1/1-1/4: 118 ONTs went LOS at 10:42. NOC note: contractor hit fiber on Route 9, splice crew dispatched.',
      data:[['Affected ONTs','118'],['NOC','Fiber cut, splice crew dispatched']],
      options:[
      {t:'Tell them it’ll be fixed before their meeting.', s:0, why:'Splices take time. Don’t promise.'},
      {t:'Tell them there’s an outage and they should wait for it to come back.', s:1, why:'True, but cold, and it leaves them stuck.'},
      {t:'Keep troubleshooting their ONT anyway, just in case.', s:0, why:'Wastes their time during a known outage.'},
      {t:'Confirm the fiber cut and that a crew is on it, without promising a time.', s:2, why:'Honest and clear.'}]},
    { say:'Customer: “So what am I supposed to do about my noon meeting?”',
      options:[
      {t:'Suggest a phone hotspot, note an outage credit per policy, and explain updates.', s:2, why:'Practical help now, fair treatment later, and a way to stay informed.'},
      {t:'Tell them that isn’t our problem.', s:0, why:'Damages the relationship for no reason.'},
      {t:'Suggest they use their phone as a hotspot for the meeting, then end the call.', s:1, why:'Helpful, but no credit or update path.'},
      {t:'Promise them a full month free.', s:0, why:'Exceeds normal authority. Follow the credit policy.'}]}],
   lesson:'Check the PON before troubleshooting, be honest about repair times, and help with a workaround.' },

 { id:'m-a-bill', net:'any', topic:'Billing', plan:'100/20 Mbps',
   quotes:['My bill doubled! What’s going on?',
           'You charged me twice this month.',
           'Why is my bill so high?'],
   data:[['Caller','Says they’re the account holder']],
   steps:[
    { options:[
      {t:'Read them the full account details right away.', s:0, why:'You haven’t verified who you’re talking to.'},
      {t:'Ask for the service address to confirm the account, then continue.', s:1, why:'An address alone is weak verification.'},
      {t:'Tell them to check their online account instead.', s:0, why:'Deflects a question you can answer.'},
      {t:'Verify their identity with your security steps first.', s:2, why:'Billing details are private. Verify first.'}]},
    { say:'Verified. The bill shows a $23.17 prorated charge for an upgrade on the 14th, plus the new $93 monthly rate.',
      data:[['Prorated upgrade','$23.17'],['New monthly','$93.00']],
      options:[
      {t:'Explain the two charges and confirm next month will be $93.', s:2, why:'Clear and complete. They know what to expect.'},
      {t:'Tell them the system is always right.', s:0, why:'Dismissive, and they still don’t understand it.'},
      {t:'Refund the prorated charge so the bill matches their old amount.', s:1, why:'Ends the complaint, but the charge was valid.'},
      {t:'Downgrade them back to the old plan.', s:0, why:'They wanted the upgrade. They just didn’t understand the bill.'}]},
    { say:'Customer: “Okay, that makes sense. I didn’t know it worked like that.”',
      options:[
      {t:'Pitch a TV package before ending the call.', s:0, why:'Poor timing right after a billing complaint.'},
      {t:'Thank them for calling and end the call.', s:1, why:'Fine, but a quick recap prevents confusion later.'},
      {t:'Recap the next bill amount and offer to email a breakdown.', s:2, why:'Closes cleanly and leaves a written record.'},
      {t:'Tell them they should have read the terms.', s:0, why:'Undoes the goodwill you just earned.'}]}],
   lesson:'Verify first, explain charges plainly, and close with a recap.' }
);
