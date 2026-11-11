// Adds the SRM-only student marketplace and opportunity board to Campus.
// Payments and purchases are arranged directly by students; Borrowed does not process them.
(() => {
  const originalRender = window.renderCampusCommunity;
  const typeLabels = { item_sale: 'For sale', item_exchange: 'Exchange', giveaway: 'Free', deal: 'Campus deal', opportunity: 'Opportunity', missing_id: 'Missing ID card', found_id: 'Found ID card' };
  const boardTypes = {
    market: ['item_sale', 'item_exchange', 'giveaway'],
    opportunities: ['deal', 'opportunity'],
    'id-cards': ['missing_id', 'found_id']
  };
  let boardLoaded = false;
  let boardLoadPromise = null;
  const activeBoardTab = () => ['market', 'opportunities', 'id-cards'].includes(communityTab);
  const own = post => cloudMode && post.owner_id === cloud?.uid;

  function installTabs() {
    const tabs = document.querySelector('.community-tabs');
    if (!tabs) return;
    tabs.dataset.boardInstalled = 'true';
    const additions = [
      ['market', 'Student marketplace'],
      ['opportunities', 'Deals & opportunities'],
      ['id-cards', 'Lost & found IDs']
    ];
    additions.forEach(([tab, label]) => {
      if (!tabs.querySelector(`[data-community-tab="${tab}"]`)) {
        tabs.insertAdjacentHTML('beforeend', `<button class="tab" data-community-tab="${tab}">${label}</button>`);
      }
    });
    syncBoardTabs();
  }

  function syncBoardTabs() {
    const tabs = document.querySelector('.community-tabs');
    if (!tabs) return;
    tabs.querySelectorAll('[data-community-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.communityTab === communityTab);
      button.setAttribute('aria-pressed', button.dataset.communityTab === communityTab ? 'true' : 'false');
    });
    const toolbar = document.querySelector('.community-toolbar span');
    const create = document.querySelector('#community-create');
    if (toolbar && create) {
      const copy = {
        skills: ['Short peer-learning sessions. Earn credits when both students confirm completion.', '＋ Offer a skill'],
        teams: ['Find collaborators for hackathons, competitions, and student projects.', '＋ Find teammates'],
        market: ['Buy, exchange, or give away useful things with verified SRM students. Coordinate and pay directly.', '＋ Create a listing'],
        opportunities: ['Find campus discounts, workshops, gigs, hackathons, and other student opportunities.', '＋ Post an opportunity'],
        'id-cards': ['Help return missing campus ID cards. Never post a card number, photo, QR code, or private details.', '＋ Post an ID card notice']
      }[communityTab];
      if (copy) { toolbar.textContent = copy[0]; create.textContent = copy[1]; }
    }
  }

  function renderBoard() {
    const content = document.querySelector('#community-content');
    if (!content || !activeBoardTab()) return;
    const allowed = boardTypes[communityTab];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const posts = (communityData.boardPosts || []).filter(p => allowed.includes(p.post_type) && (p.status === 'open' || own(p)) && (own(p) || !p.expires_at || p.expires_at >= today));
    const mine = posts.filter(own);
    const incoming = (communityData.boardInterests || []).filter(i => mine.some(p => p.id === i.post_id) && i.user_id !== cloud?.uid);
    const cards = posts.map(post => {
      const interest = (communityData.boardInterests || []).find(i => i.post_id === post.id && i.user_id === cloud?.uid);
      const others = incoming.filter(i => i.post_id === post.id);
      const date = post.expires_at ? ` · Closes ${new Date(`${post.expires_at}T12:00:00`).toLocaleDateString()}` : '';
      const price = post.post_type === 'item_sale' && post.price_rupees ? `<strong>₹${Number(post.price_rupees).toLocaleString('en-IN')}</strong>` : post.post_type === 'item_sale' ? '<span>Price by arrangement</span>' : '';
      const responseControls = others.map(i => `<div class="board-interest"><span>${esc(communityName(i.user_id))}: ${esc(i.introduction)}</span><span class="status-pill ${i.status === 'accepted' ? 'done' : ''}">${esc(i.status)}</span>${i.status === 'pending' ? `<button class="outline-button" data-board-answer="decline:${i.id}">Decline</button><button class="primary-button community-action" data-board-answer="accept:${i.id}">Accept</button>` : ''}${i.status === 'accepted' ? `<button class="outline-button" data-board-chat="${post.id}" data-board-with="${i.user_id}">Message</button>` : ''}</div>`).join('');
      const interestAction = communityTab === 'market' ? 'Contact student' : communityTab === 'id-cards' ? (post.post_type === 'missing_id' ? 'I found this card' : 'This is my card') : 'I’m interested';
      const privateId = own(post) && post.privateRegistrationNo ? `<p class="campus-post-disclosure"><b>Private Reg. No.:</b> ${esc(post.privateRegistrationNo)} · visible only to you</p>` : '';
      return `<article class="community-card board-card"><div class="community-card-top"><span class="community-tag">${esc(typeLabels[post.post_type] || 'Campus post')}</span><span class="community-format">${esc(post.category || 'Other')}${esc(date)}</span></div><h3>${esc(post.title)}</h3><p>${esc(post.description)}</p>${privateId}<div class="community-meta"><span>Posted by ${esc(communityName(post.owner_id))}</span>${price}</div>${responseControls ? `<div class="board-interests"><b>Responses</b>${responseControls}</div>` : ''}<div class="community-card-bottom">${own(post) ? `<span class="status-pill ${post.status === 'open' ? 'done' : ''}">${post.status === 'open' ? 'Live' : 'Closed'}</span><button class="outline-button" data-board-status="${post.id}">${post.status === 'open' ? 'Close post' : 'Reopen post'}</button><button class="outline-button" data-board-delete="${post.id}">Delete</button>` : interest ? `<span class="status-pill ${interest.status === 'accepted' ? 'done' : ''}">${interest.status === 'accepted' ? 'Accepted' : interest.status === 'declined' ? 'Declined' : 'Interest sent'}</span>${interest.status === 'accepted' ? `<button class="primary-button community-action" data-board-chat="${post.id}" data-board-with="${post.owner_id}">Message poster</button>` : ''}` : `<button class="primary-button community-action" data-board-interest="${post.id}">${interestAction}</button>`}</div></article>`;
    }).join('');
    const emptyCopy = communityTab === 'market'
      ? ['No marketplace posts yet', 'Post a useful item for sale, exchange, or giveaway.', 'Share something useful']
      : communityTab === 'id-cards'
        ? ['No ID card notices yet', 'Post a brief notice if you lost or found a campus ID card.', 'Post an ID card notice']
        : ['No deals or opportunities yet', 'Share a real campus deal, workshop, gig, or event.', 'Share a useful opportunity'];
    content.innerHTML = `<div class="community-grid">${cards || `<div class="empty-state"><b>${emptyCopy[0]}</b><p>${emptyCopy[1]}</p><button class="outline-button" data-board-open-create>${emptyCopy[2]}</button></div>`}</div><section class="help-card"><span class="eyebrow">CAMPUS COMMUNITY</span><h3>${communityTab === 'id-cards' ? 'Protect your identity' : 'Keep it clear and safe'}</h3><p>${communityTab === 'id-cards' ? 'Public notices never show registration or card numbers, card photos, QR/barcodes, addresses, or phone numbers. A lost-ID registration number is stored privately and visible only to its owner. Share only a broad campus location; arrange return by private message and meet at campus security.' : 'Posts are student-submitted and not verified or endorsed by SRM or Borrowed. Meet in public campus areas. Any cash exchange is arranged directly between students; Borrowed does not process or protect payments. Never post private contact or room details.'}</p></section>`;
  }

  async function fetchBoard() {
    if (!cloudMode || !cloudUser) { communityData.boardPosts = []; communityData.boardInterests = []; return; }
    const [posts, ownInterests] = await Promise.all([
      cloud.select('campus_board_posts', 'select=*&order=created_at.desc'),
      cloud.select('campus_board_interests', `select=*&user_id=eq.${cloud.uid}&order=created_at.desc`)
    ]);
    const ownPostIds = posts.filter(own).map(p => p.id);
    const incoming = ownPostIds.length ? await cloud.select('campus_board_interests', `select=*&post_id=in.(${ownPostIds.join(',')})&order=created_at.desc`) : [];
    const ownLostIds = posts.filter(p => own(p) && p.post_type === 'missing_id').map(p => p.id);
    let privateDetails = [];
    if (ownLostIds.length) {
      try { privateDetails = await cloud.select('campus_board_private_details', `select=post_id,registration_no&post_id=in.(${ownLostIds.join(',')})`); }
      catch { /* The privacy migration may not be installed yet; public board posts still load. */ }
    }
    const privateByPost = new Map(privateDetails.map(detail => [detail.post_id, detail.registration_no]));
    posts.forEach(post => { if (privateByPost.has(post.id)) post.privateRegistrationNo = privateByPost.get(post.id); });
    communityData.boardPosts = posts;
    communityData.boardInterests = [...new Map([...ownInterests, ...incoming].map(i => [i.id, i])).values()];
  }

  async function ensureBoardLoaded(force = false) {
    if (boardLoaded && !force) return;
    if (boardLoadPromise) return boardLoadPromise;
    boardLoadPromise = fetchBoard().then(() => { boardLoaded = true; }).finally(() => { boardLoadPromise = null; });
    return boardLoadPromise;
  }

  window.renderCampusCommunity = async function(...args) {
    // The community refresh timer and board actions should refresh data in place,
    // without rebuilding the Campus screen or showing its initial loading state.
    if (screen === 'community' && activeBoardTab() && document.querySelector('.community-tabs[data-board-installed]')) {
      try { await ensureBoardLoaded(true); renderBoard(); }
      catch (error) { showToast('Could not refresh campus posts. Try again shortly.'); }
      return;
    }
    const renderPromise = originalRender.apply(this, args);
    if (screen === 'community') installTabs();
    await renderPromise;
    if (screen !== 'community') return;
    installTabs();
    if (activeBoardTab()) {
      try { await ensureBoardLoaded(true); renderBoard(); }
      catch (error) {
        const content = document.querySelector('#community-content');
        if (content) content.innerHTML = `<div class="empty-state"><b>Campus marketplace is not set up yet</b><p>${esc(error.message || 'Check your connection.')}</p><p>Run <code>supabase-campus-market.sql</code> in Supabase SQL Editor, then reload this page.</p><button class="outline-button" data-community-retry>Try again</button></div>`;
      }
    }
  };

  function openPostDialog() {
    if (!cloudMode || !cloudUser) { communityOpenAuth(); return; }
    const fields = document.querySelector('#campus-post-fields');
    const heading = document.querySelector('#campus-post-heading');
    const subtitle = document.querySelector('#campus-post-subtitle');
    const common = (kind, options, titleLabel, titlePlaceholder, categoryLabel, categoryPlaceholder, detailsLabel, detailsPlaceholder, extra = '') => `
      <label class="field-label" for="campus-post-type">${kind}</label><select id="campus-post-type" class="field">${options}</select>
      <label class="field-label" for="campus-post-title">${titleLabel}</label><input id="campus-post-title" class="field" maxlength="100" placeholder="${titlePlaceholder}" required />
      <label class="field-label" for="campus-post-category">${categoryLabel}</label><input id="campus-post-category" class="field" maxlength="50" placeholder="${categoryPlaceholder}" />
      <label class="field-label" for="campus-post-description">${detailsLabel}</label><textarea id="campus-post-description" class="field" maxlength="1200" placeholder="${detailsPlaceholder}" required></textarea>${extra}`;
    if (communityTab === 'market') {
      heading.textContent = 'Create a marketplace post';
      subtitle.textContent = 'Add item details so other students know what you’re offering.';
      fields.innerHTML = common('What are you offering?', '<option value="item_sale">Sell an item</option><option value="item_exchange">Exchange an item</option><option value="giveaway">Give an item away</option>', 'Item name', 'e.g. Scientific calculator', 'Item category', 'e.g. Books, electronics, stationery', 'Item details and condition', 'Describe condition, included parts, and exchange preference', '<div id="campus-price-wrap"><label class="field-label" for="campus-post-price">Asking price in ₹ (optional)</label><input id="campus-post-price" class="field" type="number" min="1" max="1000000" placeholder="e.g. 300" /></div><label class="field-label" for="campus-post-expires">Listing closes (optional)</label><input id="campus-post-expires" class="field" type="date" /><p class="campus-post-disclosure">Arrange payment directly and meet in a public campus place. Borrowed does not process or protect payments.</p>');
    } else if (communityTab === 'opportunities') {
      heading.textContent = 'Share a deal or opportunity';
      subtitle.textContent = 'Include the essentials so students can tell if it’s right for them.';
      fields.innerHTML = common('Post type', '<option value="deal">Campus deal or discount</option><option value="opportunity">Event, workshop, gig, or competition</option>', 'Title', 'e.g. Robotics workshop registration', 'Category', 'e.g. Workshop, food deal, part-time gig', 'Details', 'What is offered, who can join, and any requirements', '');
      fields.insertAdjacentHTML('beforeend', '<label class="field-label" for="campus-post-when">Date or deadline (optional)</label><input id="campus-post-when" class="field" maxlength="80" placeholder="e.g. 22 November, 5 pm" /><label class="field-label" for="campus-post-where">Campus location or online (optional)</label><input id="campus-post-where" class="field" maxlength="100" placeholder="e.g. Main auditorium" /><label class="field-label" for="campus-post-expires">Post closes (optional)</label><input id="campus-post-expires" class="field" type="date" /><p class="campus-post-disclosure">Only share opportunities you can verify. Don’t post private contact details or misleading offers.</p>');
    } else {
      heading.textContent = 'Post a lost or found ID notice';
      subtitle.textContent = 'Help return the card without exposing anyone’s identity.';
      fields.innerHTML = common('Notice type', '<option value="missing_id">I lost an ID card</option><option value="found_id">I found an ID card</option>', 'Short notice title', 'e.g. Found near the library', 'Broad campus location', 'e.g. Library entrance (no room or exact personal location)', 'When was it lost or found?', 'e.g. Today around lunchtime', '');
      fields.insertAdjacentHTML('beforeend', '<div id="campus-regno-wrap"><label class="field-label" for="campus-post-regno">Your registration number (private)</label><input id="campus-post-regno" class="field" type="text" maxlength="30" autocomplete="off" placeholder="Enter the Reg. No. printed on your ID" required /><small>Used only on your lost-ID notice and visible only to you, never in the public post.</small></div><label class="field-label" for="campus-post-expires">Remove notice after (optional)</label><input id="campus-post-expires" class="field" type="date" /><p class="campus-post-disclosure">Do not add card photos, QR/barcodes, phone numbers, or other identifying details to the public post. Arrange return by private message and meet at campus security.</p>');
    }
    const type = document.querySelector('#campus-post-type');
    type.addEventListener('change', () => {
      const priceWrap = document.querySelector('#campus-price-wrap');
      if (priceWrap) priceWrap.hidden = type.value !== 'item_sale';
      const title = document.querySelector('#campus-post-title');
      if (communityTab === 'id-cards') title.placeholder = type.value === 'found_id' ? 'e.g. Found near the library' : 'e.g. Lost near the library';
      const regNo = document.querySelector('#campus-post-regno');
      if (regNo) { regNo.required = type.value === 'missing_id'; document.querySelector('#campus-regno-wrap').hidden = type.value !== 'missing_id'; }
    });
    type.dispatchEvent(new Event('change'));
    document.querySelector('#campus-post-dialog').showModal();
  }

  document.addEventListener('click', async event => {
    const campusTab = event.target.closest('[data-community-tab]');
    if (campusTab && ['skills', 'teams', 'market', 'opportunities', 'id-cards'].includes(campusTab.dataset.communityTab)) {
      event.preventDefault(); event.stopImmediatePropagation();
      communityTab = campusTab.dataset.communityTab;
      syncBoardTabs();
      const content = document.querySelector('#community-content');
      if (!activeBoardTab()) { drawCommunity(); return; }
      if (boardLoaded) { renderBoard(); return; }
      if (content) content.innerHTML = '<div class="empty-state board-loading"><span class="board-spinner" aria-hidden="true"></span><b>Loading campus posts…</b></div>';
      try { await ensureBoardLoaded(); renderBoard(); }
      catch (error) {
        if (content) content.innerHTML = `<div class="empty-state"><b>Campus marketplace is not set up yet</b><p>${esc(error.message || 'Check your connection.')}</p><p>Run <code>supabase-campus-market.sql</code> in Supabase SQL Editor, then reload this page.</p><button class="outline-button" data-community-retry>Try again</button></div>`;
      }
      return;
    }
    const create = event.target.closest('#community-create,[data-board-open-create]');
    if (create && activeBoardTab()) { event.preventDefault(); event.stopImmediatePropagation(); openPostDialog(); return; }
    const interestButton = event.target.closest('[data-board-interest]');
    if (interestButton) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!cloudMode || !cloudUser) { communityOpenAuth(); return; }
      const post = communityData.boardPosts.find(p => p.id === interestButton.dataset.boardInterest);
      document.querySelector('#board-interest-title').textContent = post?.title || 'Campus post';
      document.querySelector('#board-interest-dialog').dataset.postId = interestButton.dataset.boardInterest;
      document.querySelector('#board-introduction').value = '';
      document.querySelector('#board-interest-dialog').showModal(); return;
    }
    const answer = event.target.closest('[data-board-answer]');
    if (answer) {
      event.preventDefault(); event.stopImmediatePropagation();
      const [action, id] = answer.dataset.boardAnswer.split(':');
      try { await cloud.rpc('respond_campus_board_interest', {p_interest_id:id,p_accept:action === 'accept'}); await window.renderCampusCommunity(); showToast(action === 'accept' ? 'Accepted. Messaging is now available.' : 'Interest declined.'); }
      catch (error) { showToast(error.message); }
      return;
    }
    const status = event.target.closest('[data-board-status]');
    if (status) {
      event.preventDefault(); event.stopImmediatePropagation();
      const post = communityData.boardPosts.find(p => p.id === status.dataset.boardStatus);
      try { await cloud.update('campus_board_posts', `id=eq.${post.id}&owner_id=eq.${cloud.uid}`, {status:post.status === 'open' ? 'closed' : 'open'}); await window.renderCampusCommunity(); }
      catch (error) { showToast(error.message); }
      return;
    }
    const remove = event.target.closest('[data-board-delete]');
    if (remove) {
      event.preventDefault(); event.stopImmediatePropagation();
      const post = communityData.boardPosts.find(p => p.id === remove.dataset.boardDelete);
      if (!post || !confirm(`Permanently delete “${post.title}” and its responses?`)) return;
      try { await cloud.remove('campus_board_posts', `id=eq.${post.id}&owner_id=eq.${cloud.uid}`); await window.renderCampusCommunity(); showToast('Post deleted.'); }
      catch (error) { showToast(error.message); }
      return;
    }
    const chat = event.target.closest('[data-board-chat]');
    if (chat) {
      event.preventDefault(); event.stopImmediatePropagation();
      const post = communityData.boardPosts.find(p => p.id === chat.dataset.boardChat);
      activeTeamChat = {kind:'board',id:post.id,with:chat.dataset.boardWith};
      document.querySelector('#community-chat-title').textContent = `Chat · ${post.title}`;
      document.querySelector('#community-chat-dialog').showModal();
      await refreshCommunityChat(); clearInterval(teamChatTimer);
      teamChatTimer = setInterval(() => { if (document.querySelector('#community-chat-dialog').open) refreshCommunityChat().catch(() => {}); }, 5000);
    }
  }, true);

  document.addEventListener('submit', async event => {
    if (event.target.id === 'campus-post-dialog-form') {
      event.preventDefault();
      if (!cloudMode || !cloudUser) { communityOpenAuth(); return; }
      const postType = document.querySelector('#campus-post-type').value;
      const title = document.querySelector('#campus-post-title').value.trim();
      let description = document.querySelector('#campus-post-description').value.trim();
      if (title.length < 3 || description.length < 5) { showToast('Add a title and a few details before posting.'); return; }
      const privateRegNo = communityTab === 'id-cards' && postType === 'missing_id' ? document.querySelector('#campus-post-regno').value.trim() : '';
      if (communityTab === 'id-cards' && postType === 'missing_id' && privateRegNo.length < 3) { showToast('Enter the registration number so you can verify your lost ID.'); return; }
      const price = document.querySelector('#campus-post-price')?.value || '';
      let category = document.querySelector('#campus-post-category').value.trim() || 'Other';
      if (communityTab === 'opportunities') {
        const when = document.querySelector('#campus-post-when')?.value.trim();
        const where = document.querySelector('#campus-post-where')?.value.trim();
        description = `${when ? `When: ${when}\n` : ''}${where ? `Where: ${where}\n` : ''}${description}`;
      } else if (communityTab === 'id-cards') {
        const location = category;
        category = 'ID card notice';
        description = `Approx. location: ${location}\nWhen: ${description}\nArrange return at campus security.`;
      } else if (communityTab === 'market') {
        description = `Category: ${category}\n${description}`;
      }
      try {
        const inserted = await cloud.insert('campus_board_posts', {owner_id:cloud.uid,post_type:postType,title,description,category,price_rupees:postType === 'item_sale' && price ? Number(price) : null,expires_at:document.querySelector('#campus-post-expires')?.value || null,status:'open'});
        if (privateRegNo) {
          const post = Array.isArray(inserted) ? inserted[0] : inserted;
          if (!post?.id) throw new Error('The private registration number could not be attached to your notice. Please try again.');
          try { await cloud.insert('campus_board_private_details', {post_id:post.id,owner_id:cloud.uid,registration_no:privateRegNo}); }
          catch (error) { await cloud.remove('campus_board_posts', `id=eq.${post.id}&owner_id=eq.${cloud.uid}`).catch(() => {}); throw new Error('Could not save the private registration number. Apply supabase-campus-private-id.sql in Supabase, then try again.'); }
        }
        document.querySelector('#campus-post-dialog').close(); event.target.reset();
        await window.renderCampusCommunity(); showToast('Your post is live for SRM students.');
      } catch (error) { showToast(error.message); }
      return;
    }
    if (event.target.id === 'board-interest-form') {
      event.preventDefault();
      const intro = document.querySelector('#board-introduction').value.trim();
      if (intro.length < 5) { showToast('Add a short message (at least 5 characters).'); return; }
      try {
        await cloud.insert('campus_board_interests', {post_id:document.querySelector('#board-interest-dialog').dataset.postId,user_id:cloud.uid,introduction:intro});
        document.querySelector('#board-interest-dialog').close(); await window.renderCampusCommunity(); showToast('Your message was sent to the poster.');
      } catch (error) { showToast(error.message); }
      return;
    }
    if (event.target.id === 'community-chat-form' && activeTeamChat?.kind === 'board') {
      event.preventDefault(); event.stopImmediatePropagation();
      const input = document.querySelector('#community-chat-input'), body = input.value.trim();
      if (!body) return;
      try { await cloud.insert('campus_board_messages', {post_id:activeTeamChat.id,sender_id:cloud.uid,recipient_id:activeTeamChat.with,body}); input.value = ''; await refreshCommunityChat(); }
      catch (error) { showToast(error.message); }
    }
  }, true);

  const originalRefreshChat = refreshCommunityChat;
  refreshCommunityChat = async function(...args) {
    if (activeTeamChat?.kind !== 'board') return originalRefreshChat.apply(this, args);
    if (!cloudMode || !cloudUser) return;
    const uid = cloud.uid, peer = activeTeamChat.with;
    const messages = await cloud.select('campus_board_messages', `select=*&post_id=eq.${activeTeamChat.id}&or=(and(sender_id.eq.${uid},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${uid}))&order=created_at.asc`);
    const box = document.querySelector('#community-chat-messages');
    box.innerHTML = messages.map(m => `<div class="chat-message ${m.sender_id === cloud.uid ? 'mine' : ''}"><p>${esc(m.body)}</p><small>${new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('') || '<div class="chat-empty">Start a conversation to coordinate.</div>';
    box.scrollTop = box.scrollHeight;
  };
})();
