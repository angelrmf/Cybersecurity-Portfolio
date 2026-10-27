
# TryHackMe SOC Simulator: Introduction to Phishing

## Overview

Hands-on alert triage and incident reporting in the TryHackMe SOC Simulator. I worked through the "Introduction to Phishing" scenario as a SOC analyst: reviewing alerts, deciding true positive or false positive, correlating events across data sources, deciding on escalation, and filling in case reports.

<img width="1568" height="658" alt="image" src="https://github.com/user-attachments/assets/08800877-8ce9-422c-b478-6911703f4e15" />


**Related TryHackMe rooms completed:**
- Introduction to Phishing
- Phishing Unfolding

**Skills practiced:**
- Alert triage and prioritization
- Cross-source correlation (email gateway, firewall, Sysmon)
- True positive / false positive classification
- Writing case reports with evidence, reasoning and remediation
- Recognizing legitimate Windows processes vs. attacker tooling

---

## Triage Approach

Severity alone is not priority. Instead of starting with the single "High" firewall alert, I grouped the alerts by theme. The email alerts showed the delivery stage of a possible phishing campaign, and the firewall alert might be a consequence of one of them. I checked timestamps and indicators across alerts to see whether they formed one incident or were independent.

---

## Incident 1: Phishing Email Leading to a Firewall Block

**Activity window:** Jun 30th 2026, 08:50 to 08:54

| Alert ID | Type | Details | Verdict |
|----------|------|---------|---------|
| 8814 | Suspicious email link | Sender `onboarding@hrconnex.thm` to `j.garcia@thetrydaily.thm` | **False positive** |
| 8815 | Suspicious email link | Sender `urgents@amazon.biz` to `h.harris@thetrydaily.thm` | **True positive** |
| 8816 | Firewall block | Source `10.20.2.17` to destination `67.199.248.11` | **True positive, escalated** |

### Reasoning

**8814, false positive:** The link is tied to a specific account for HR onboarding, which fits a legitimate business process. It also did not trigger any firewall activity.

**8815, true positive:** The sender domain (`amazon.biz`) does not match the official brand it claims to represent. The URL in the email matched the destination blocked by the firewall a few minutes later.

**8816, true positive, escalated:** The blocked destination matches the link in email 8815, so the user most likely clicked the link, and the firewall activity is the follow-up to the phishing email. The traffic used port 80 (unencrypted HTTP) and a high port, 34257.

### Indicators of Compromise

- **Sender:** `urgents@amazon.biz` (brand impersonation, domain mismatch)
- **Targeted user:** `h.harris@thetrydaily.thm`
- **Internal source IP:** `10.20.2.17`
- **Destination IP:** `67.199.248.11` (blocked by the firewall; the URL matches the one in email 8815)
- **Ports:** 80 (HTTP), 34257
- **Pattern:** phishing email, link click, outbound connection a few minutes later

### Recommended Remediation

- Analyze the link in an isolated sandbox
- Investigate both the source and destination IPs
- Block the sender domain and the destination IP/URL
- Confirm which user is tied to `10.20.2.17` and review their activity
- Reset credentials if there is any sign of interaction
- User awareness reminder about brand-impersonation emails

### Lesson learned

I initially described the destination IP as a "C2 server" without evidence. In a report, indicators should be labeled with what the data shows (here, "blocked by the firewall and linked to a phishing URL"), not what I assume.

---

## Incident 2: Host and Email Alerts (Sep 22nd 2026)

### Suspicious Parent/Child Process Alerts, all False Positives

These alerts fired from a rule for uncommon parent-child process relationships. Each one turned out to be normal Windows behavior.

| Alert ID | Host | Process | Parent | Why it is legitimate |
|----------|------|---------|--------|----------------------|
| 1001 | win-3459 | `TrustedInstaller.exe` | `services.exe` | Windows servicing/update process, run from `C:\Windows\servicing\` |
| 1002 | win-3451 | `taskhostw.exe KEYROAMING` | `svchost.exe` | Task Host, standard parameter, system32 path |
| 1006 | win-3450 | `rdpclip.exe` | `svchost.exe` | Remote Desktop clipboard process, normal for RDP sessions |
| 1008 | win-3455 | `WUDFHost.exe` | `services.exe` | User-Mode Driver Framework host, long GUID arguments are normal |
| (unlabeled) | win-3459 | `svchost.exe -k wsappx -p` | `services.exe` | Standard service group for Microsoft Store app services |

**What I checked on each:** process name, parent process, file path/working directory, command-line arguments, and whether anything pointed to a follow-on action.

**Takeaway:** A rule firing on an unusual relationship is not proof of malice. The rule should be tuned to exclude known-good Windows service patterns. Note that RDP being a general risk (exposure, weak credentials) is a separate issue from this alert, which is just a normal process.

### Alert 1013: Scam Email from External Domain, True Positive (no escalation)

- **Subject:** "Work from Home and Make 10000 a Day Scam Alert"
- **Sender:** `griffin@hatventuresworldwide.online` (unusual top-level domain)
- **Attachment/links:** none
- **Verdict:** True positive. The alert flagged unsolicited scam content that should not reach the inbox. A malicious email does not need a link or attachment to count.
- **Escalation:** Not needed. Low severity, no malware, no link, no sign of user interaction. Handle with a sender/domain block and filter tuning.
- **Note:** The alert description says the rule still needs fine-tuning, which is worth passing on.

### Alert 1020: PowerShell Script in Downloads Folder, True Positive, Escalate

- **Host:** win-3450
- **Event:** Sysmon file create (event code 11) by `powershell.exe`
- **File:** `C:\Users\michael.ascot\Downloads\PowerView.ps1`
- **Why it matters:** PowerView is a well-known PowerShell tool for Active Directory/domain enumeration, commonly used during post-compromise reconnaissance. It is not something a typical user would have in Downloads.
- **Verdict:** True positive, escalate.
- **Recommended actions:** isolate the host, investigate how the file arrived, review PowerShell and process activity on the machine, check the account for suspicious activity, and hunt for related reconnaissance or lateral movement.
- **Caveat:** The alert shows the file being created but not how it got there. I should not claim a link to the Jun 30 phishing incident without evidence, and this alert is on a different date and different hosts.

---

## Key Takeaways

1. **Correlate before you prioritize.** Matching a URL in an email alert to a blocked firewall destination turned separate alerts into a single attack story.
2. **True/false positive is about whether the detection was right**, not about how dangerous the thing is. Scam email without links is still a true positive.
3. **Escalation depends on impact and evidence of compromise**, not just on whether something is malicious.
4. **Know normal Windows processes**, so false positives can be dismissed confidently and tools like PowerView stand out immediately.
5. **Report only what the evidence supports.** Label indicators precisely and avoid unproven attributions.

## Reference: Alert Classification Quick Guide

| Question | Answer |
|----------|--------|
| Did the alert correctly detect something malicious or unwanted? | True positive |
| Did it flag benign, expected activity? | False positive |
| Is there evidence of compromise, active attacker tooling, or user impact? | Escalate |
| Low-risk, contained, no user interaction? | Document and tune, no escalation |
