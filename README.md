# Wikiplotter

## Problem Statement

### Domain 
Spoiler-aware narrative fiction wikis; narrative fiction is an umbrella term describing the genre for imagined stories told in an event-centric fashion. The beauty of narrative fiction is often found in getting absorbed in a story told in a way such as to only be able to unravel more about the world the further one reads. This is characterized by unknowns surrounding various events, or events which simply haven't occurred yet chronologically, which are important to the author's intended narrative to be carefully explored in their original order, delivering the best (or at least, most authentic) experience possible to readers. Accompanying a piece of narrative fiction can also be a vibrant community of readers who enjoy consolidating information about the story (e.g. character profiles, event timelines, etc.) in an online hub, known as a "**wiki.**"

Unfortunately, as a central hub of information, the wiki is also home to "spoilers," those important narrative unknowns which can be detrimental to the reading experience if revealed prematurely to a new reader. In general, most readers tend to value a spoiler-free experience. However, it's also not uncommon for excited readers to get ahead of themselves for whatever reason, and stumble upon a random spoiler for their latest read. Whether it be via a Google Search, through practiced wiki surfing, or unexpected online discussion, there are never any guarantees that the next page one clicks is spoiler-free. Just a single sentence or image can convey a spoiler that the reader carries with them for the rest of their experience. 

### Bad Situations 
The following are potential, slightly exaggerated, made-up scenarios:

1. *Art contains spoilers or is spoiler-adjacent.* Alice has recently picked up The Adventures of the Red Dragon. She's only at around chapter 20, and most of the story has revolved around setting the scene and building up a picture of the world and its characters. In particular, Alice has fallen in love with the image of the Red Dragon in her mind and can't hold herself back from searching up official or fan-made art of the Red Dragon to compare with her own mental image. However, the first result in Google Image Search is a beautiful fan-made piece depicting the Red Dragon... holding her dead brother in her arms. A pivotal turning point in the later chapters has now been irreversibly implanted in Alice's mind, and she will carry it with her from chapter 20 onwards. 

2. *Reading a spoiler while referring to the wiki.* Bob has also started reading The Adventures of the Red Dragon. Compared to Alice, Bob is much further along and has managed to steer clear of any spoilers until around chapter 50. However, the world of the dragons is incredibly vast and the author packed it with details. Bob thinks he remembers a particular plot-relevant detail about an item mentioned in earlier chapters and thinks it's worth searching the wiki to confirm it. Unfortunately, even as experienced as he is at browsing wikis, upon finding the relevant sentence in the wiki, he also reads the next sentence unceremoniously explaining exactly how it becomes relevant to the plot with. It was even a bit of a plot twist, but Bob now knows exactly how events will unfold around this item, pouring a bucket of water on his usual speculation. 

3. *Spoiler-free page has unexpected spoilers.* 

4. *Spoiler-tagged page still reveals an unintended spoiler. ie no way to track progress* 


### Corroboration 
- **Personal experience** with reading narrative fiction and frequently referring back to the openly-contributed wiki lends to a personal desire for wikis which enforce better spoiler-protection. Every wiki is different in their own way, and contributors don't always set up these protections.

-  [Reddit - how do I forget a major spoiler?](https://www.reddit.com/r/OmniscientReader/comments/1wy3y8n/how_do_i_forget_a_major_orv_spoiler_help_me/) Readers of the popular webnovel "Omniscient Reader's Viewpoint" often complain about stumbling upon spoilers while reading. Especially with the novel's rise in popularity and sprawling fanbase, many spoilers float freely online and easily come up even in only vaguely-related searches. 

-  [Spoiler Alert! - On the Modern Problem of Spoilerphobia](https://reactormag.com/spoiler-alert-on-the-modern-problem-of-spoilerphobia/) In a different light, this article talks about the culture of "spoilerphobia," understanding the importance of narrative revelations but also resenting the emphasis placed on censorship for the sake of preserving these revelations. From a different perspective, this can be viewed as corroboration for a certain desire for anxiety-free discussion where one doesn't need to worry about spoilers (although, the article advocates for not caring so much about spoilers in general). 

    Some comments under the article express agreement with seeing more, unexpected modern hysteria around spoilers. Others also point to the value of spoilers, helping them to avoid wastes of time and read stories stress-free. Other comments corroborate the idea that readers still value a good first-time experience without knowing what happens next. 

### Workarounds and comparables 
1.  [Spliki](spliki.com) was a spoiler-free wiki for a long time before shutting down.
 
2.  [Without Spoilers](withoutspoilers.com) appears to be a wiki site with a collection of various narrative works where users can input their own reading progress before gaining access to the wiki's entry for that work. Articles appear based on whether your reading progress has reached a certain point, and the site also provides event timelines according to the same rules. Within articles themselves, certain sections also remain unlocked if your progress hasn't reached a certain point. 

    However, Without Spoilers provides a limited framework for developing a wiki without spoilers. Its rigidity is seen in the way that articles only reveal themselves incrementally based on your chronological reading progress, ignoring the non-chronological nature of relevant sections in any given article. Moreover, the style is uniform across the website, suggesting a lack of open contributor support. 

3.  [Malazan Wiki](https://malazan.fandom.com/wiki/Malazan_Wiki:New_Readers_Zone) is a Fandom wiki contributed to by the Malazan fanbase with a specially curated spoiler-free section for new readers. Moreover, fan-made art, chapter summaries, and the like which comprise many pages of the wiki undergo a vetting process around keeping pages safe. This wiki is a great example of organizational efforts to keep a reading experience spoiler-free and enjoyable for new readers. Unfortunately, it is limited to a single franchise, Malazan, and a similar framework can be adapted for all-purpose use. 

### Solution sketch
I propose a web application similar to the service provided by Fandom for creating wikis that can be openly contributed to. Unlike Fandom, [Insert Name] will be more opinionated, and provides a framework for contributors to produce articles as long as they follow the guidelines for spoiler-free article creation. 

In order to address the issue of producing of spoiler-free articles, this framework forces contributors to identify "checkpoints" for every piece of media they contribute to the wiki. Contributors have the freedom to decide the scope of media which their checkpoints affect, i.e. they can tag sentences, paragraphs, blurbs, sections, images, or even an entire article itself. For every wiki user, their individual reading progress can be checked against these checkpoints in order to decide which media should be made available to them. 

The web application produces a wiki for every series, known as a hub. Every hub defines their own unique wiki for a piece of narrative fiction, and is freely customizable by design. Main contributors for a hub can retain control over the finer details of configuring spoiler handling, as well as can freely define contribution guidelines for their wiki. Human-defined rules and behaviors are not intended to be strictly checked against, but rather guide their hub's contributors and users to navigate the provided framework. Within this framework, every hub defines its own checkpoints, is able to develop a graph-like timeline for safe wiki surfing, and dedicates an article to onboarding new readers. 

#### Stakeholders
- **Readers**: Readers are the end-users we want to benefit directly from a spoiler-aware wiki, as there are many reasons a reader might want to explore a wiki, even at the risk exposure to spoilers.
- **Creators**: Creators of narrative fiction are secondary users we want to receive passive benefits from having a trustworthy, user-friendly wiki as a hub of information for their source work, creating a place of value for their community to contribute to.
- **Wiki Contributors**: Wiki contributors make up the other half of the end-users, which may overlap with readers and creators, whom we want to benefit from having a framework for managing safe, spoiler-aware contributions to a wiki.


## Pitch 
### Wikiplotter
**Motivation:** Narrative fiction enjoyers want to browse a centralized hub for a given series, and want to do so without worrying about revealing information (spoilers) beyond their current reading progress.

Wikiplotter is the wiki creation platform for narrative fiction that protects its readers from spoilers, on every hub. As a wiki community grows, you don't need to worry about growing the spoiler tags with it. Instead of expecting readers to be seasoned wiki navigators--dodging spoiler warnings and having to guess which unmarked pages are safe--Wikiplotter enforces all of its hosted articles to adopt what we call "checkpoint" tags, allowing information to be filtered based on reading progress. 

**Progress Tracking**. Before entry into any series hub, users can identify their reading progress by selecting their latest chapter completed. Wikiplotter then remembers that information and uses it to filter out information on every article the user visits. As readers advance through the series, they have the option to update their reading progress as well and previously unavailable relevant information will become revealed to them. This circumvents the need for spoiler warnings, and returns control to the readers. 

**Granular Filtering**. Articles on the wiki can have varying levels of protection, from the article itself down to individual passages or sentences. A reader can browse the basic information on an article for an item that has been introduced early on, while any passages related to its later significance remain hidden to them. If a reader wants to see portraits of a character introduced in Chapter One, they can search for their images without fear of stumbling upon art of a future event. Readers are given safety guarantees, while contributors maintain the references on a single article. Wikiplotter does all the rest.

**Uniquely Yours**. Every wiki hub is different, because every story is different. Contributors take upon the responsibility of managing contribution guidelines, setting standardized checkpoints for the series, and the finer visibility settings for information that would be considered spoilers. Like any other wiki, one created with Wikiplotter is an open contribution project. We provide the framework, you have the freedom to build around it. For contributors, they can focus on morphing the wiki into its ideal form without worrying about how spoilers are handled. For creators, an online space unique to their universe can also be a safe place for the community to document and discuss their favorite series. 

Wikiplotter redefines the wiki into a friendly companion that follows the reader as the story unfolds, useful and welcoming rather than potentially dangerous. 


## Concept Design 
1.  **concept** Authenticating \
    **purpose** 

1.  **concept** ProgressTracking \
    **purpose** 

1.  **concept** Checkpointing \
    **purpose** 

1.  **concept** \
    **purpose** 

1.  **concept** \
    **purpose** 


## UI Design
TBA


## User Journey
TBA
