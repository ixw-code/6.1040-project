# Wikiplotter - Code Complete Design Summary

## Alpha - Motivation and Initial Design

**Original problem:** Wikis for fictional stories often contain information from later parts of the story, making it difficult to read about characters, locations, and events without encountering spoilers.

**Original concepts:**

- **HubCataloguing:** Hub identities and metadata.
- **Documenting:** Articles and ordered content blocks.
- **Checkpointing:** Ordered checkpoint sequences within each hub.
- **ProgressRecording:** Reader progress selections.
- **RequirementTagging:** Checkpoint requirements for articles and blocks.

These concepts were tied together simply using compositions like HubManagement, ArticleManagement, ReaderProgress, and Reading, giving readers the ability to check out Wikiplotter by browsing pre-popoulated hubs, and set their progress checkpoints to filter out spoilers in the content. The minimal frontend for Alpha includes the homepage, a hub page, an article reading page, and the ability to set reading progress.

### Alpha Demo 
See the demo for the alpha below:
<p align="center">
  <a href="https://drive.google.com/file/d/1YOJrL5zgmGN7S9tEPsCWyqzui64yi_4r/view?usp=drive_link" target="_blank" rel="noopener noreferrer">
    <img src="./docs/assets/thumbnails/alpha-demo.png" alt="Wikiplotter Alpha Demo">
  </a>
</p>


## Beta - Feature Extension

The Beta expanded heavily on the Alpha's minimal functionality by adding new concepts related to accounts and handling media other than text. The new concepts and updated old concepts were composed together to enable readers to sign in, where they can now, in addition to browsing and recording their progress, manage hubs, edit articles, and upload assets. The minimal UI design of the Alpha was also extended in the Beta into various pages that handle all of the browsing, reading, editing, settings, account, and media-management experiences.

**New concepts:**

- **Registering:** Account registration, provider identities, and usernames.
- **Sessioning:** Authenticated and anonymous session behavior.
- **MediaAssetManaging:** Uploaded media metadata and lifecycle.

**Major functionality added:**

- Google and MIT SDG Commons authentication, account registration, and persistent reading progress.
- Hub creation and management with creator-based permissions.
- Article creation and editing through ordered text, image, and video blocks.
- Checkpoint tagging through the editor.
- Media uploading, management, and protected retrieval.
- Redesigned frontend supporting login, registration, browsing, reading, editing, account-, hub-, and media-management pages. 

### Beta Demo 
See the demo for the Beta below: 

<p align="center">
  <a href="https://drive.google.com/file/d/112hfS25D1E4obQiywFr-kQ4Vh8hAKH2F/view?usp=drive_link" target="_blank" rel="noopener noreferrer">
    <img src="./docs/assets/thumbnails/beta-demo.png" alt="Wikiplotter Beta Demo">
  </a>
</p>


## Code Complete — Refinement

The final iteration focused on deployment, account deletion, and smaller UI/UX improvements, including more responsive button feedback, improved page layouts, and more intuitive navigation.

### Major Design Decisions

Several decisions shaped the scope of the final iteration:

- **Easy browsing:** Anonymous users can browse and record progress like authenticated users even without registering. Progress is stored in browser cookies, so progress persists between sessions. 
- **Spoiler safety:** Missing rules deny access by default, and content only becomes available through specific user gateways (i.e. setting progress). Any sensitive user interaction is preceded by UI warnings. 
- **Simple editing:** Articles are represented as ordered text blocks, providing sufficient structure compatible with checkpoint selection for spoiler filtering even in the absence of richer wiki features.
- **Authorization:** Permissions are account-based, to provide sufficient access control even without an elaborate contribution-role system. Login and authentication is delegated to third-party services while Wikiplotter manages the accounts, usernames, and their sessions. 
- **Data and deletion:** Assets and wiki data are managed by the users that uploaded them. Accounts, articles, hubs, and all user-created data naturally also support deletion under their respective ownership and clean-up rules. 

**Deferred features:** Search, commenting, article version history, contribution roles, profile customization, and richer editor functionality.

### Demo - TBA
See the latest demo below: 

<p align="center">
  <a href="placeholder link" target="_blank" rel="noopener noreferrer">
    <img src="./docs/assets/thumbnails/complete-demo.png" alt="Wikiplotter Complete Demo">
  </a>
</p>


## Reflection

The original design of Wikiplotter included five core concepts and four compositions that achieved the most basic functionality: serving pre-populated, spoiler-filtered articles within a scoped wiki. The final design preserves that functionality but composes three more concepts and updates all of the original concept designs in order to support an end-to-end wiki experience where users can create and manage wiki content themselves.

Creating a quality user journey introduced various challenges that weren't considered in the original concept designs, and every concept evolved to produce useful actions and queries for user endpoints. Outside of relatively straightforward concept-related state and logic, compositions also became more complicated to enforce validation and consistency requirements. 

The visual design evolved similarly. The alpha's minimal interface served primarily as a proof-of-concept, while the beta introduced separate pages with different responsibilities to support a more coherent user journey (from account creation to article editing). Manual testing during the code-complete motivated improvements to unintuitive parts of the UI/UX, through better information placement, page navigation, and more responsive UI feedback. 

Overall, I learned a lot through turning a concept-based prototype design into a usable application. Concepts are a great way to organize the functionality of an application at a high-level and provide a foundational structure for incremental development. Compositions and supporting infrastructure are also necessary to realize the functionality described by the concepts, and the application comes together when the endpoints are stitched into a coherent, user-friendly interface. 
