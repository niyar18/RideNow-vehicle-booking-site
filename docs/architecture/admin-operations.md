# Admin operations

Open `/admin` with a Jaatri administrator account. Standard rider and partner accounts are redirected away, and admin endpoints independently require an admin session. The workspace does not grant roles or bypass the existing authentication layer.

| Section | Use |
| --- | --- |
| Overview | Vendor, vehicle and video KYC reviews, vendor totals and earnings context |
| Fare rules | Preview and edit the actual quote inputs for each vehicle class, including base, distance, platform fee, tax, multiplier and effective distance limits |
| Student reviews | Filter applications and review trusted documents. Approval and rejection operate only on pending records; the reviewer must provide a reason. |
| Safety incidents | Filter alerts and move an active report into investigation. This does not close a case, change a booking, or clear an SOS. |
| Withdrawals | Check request status, amounts and dates without fetching bank or payout credentials. The dashboard never moves money. |
| Audit log | Filter action history, review before/after values and see the reason for administrative edits. |

Fare previews use the same pricing calculation as checkout but exclude traveler-specific discounts and past dues. A reason and confirmation are required to save a change. Admin fare reads never create records; the first explicit change stores the class's tariff. Updates change only submitted fields and reject stale versions. Existing bookings retain their prices.

These controls use normal application workflows, not arbitrary database edits. Live money movement, role grants, and student tariff configuration are not exposed by this workspace. When the existing audit sink fails, the UI reports that an otherwise successful decision could not be recorded. Test decisions with fixtures before using them on real applications, incidents, or fares.
