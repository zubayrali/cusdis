<script>
  import './theme.css'
  import { onMount, setContext } from 'svelte'
  import axios from 'redaxios'
  import Comment from './components/Comment.svelte'
  import Reply from './components/Reply.svelte'
  import { initials, avatarColor } from './avatar'
  import { t } from './i18n'

  export let attrs
  export let commentsResult

  let page = 1

  let loadingComments = true

  let message = ''

  let error

  let theme = attrs.theme || 'light'

  const api = axios.create({
    baseURL: attrs.host,
  })

  // locally-stored pending (unapproved) comments, keyed per page
  let pendingComments = []

  function pendingKey() {
    return `cusdis_pending:${attrs.appId}:${attrs.pageId}`
  }

  function loadPending() {
    try {
      pendingComments = JSON.parse(localStorage.getItem(pendingKey()) || '[]')
    } catch (e) {
      pendingComments = []
    }
  }

  function savePending() {
    try {
      localStorage.setItem(pendingKey(), JSON.stringify(pendingComments))
    } catch (e) {}
  }

  function addPending(comment) {
    pendingComments = [
      ...pendingComments,
      {
        id: comment.id,
        by_nickname: comment.by_nickname,
        content: comment.content,
        createdAt: comment.createdAt,
      },
    ]
    savePending()
  }

  function collectIds(comments, set = new Set()) {
    for (const c of comments || []) {
      set.add(c.id)
      if (c.replies && c.replies.data) collectIds(c.replies.data, set)
    }
    return set
  }

  // once a pending comment shows up in the approved list from the server,
  // drop it from localStorage so it isn't rendered twice
  function dedupPending() {
    if (!commentsResult || !commentsResult.data) return
    const approvedIds = collectIds(commentsResult.data)
    const before = pendingComments.length
    pendingComments = pendingComments.filter((p) => !approvedIds.has(p.id))
    if (pendingComments.length !== before) savePending()
  }

  function setMessage(msg) {
    message = msg
  }

  $: {
    document.documentElement.style.setProperty('color-scheme', theme)
  }

  $: isEmpty =
    !loadingComments &&
    commentsResult &&
    commentsResult.data.length === 0 &&
    pendingComments.length === 0

  onMount(() => {
    function onMessage(e) {
      try {
        const msg = JSON.parse(e.data)
        if (msg.from === 'cusdis') {
          switch (msg.event) {
            case 'setTheme':
              {
                theme = msg.data
              }
              break
          }
        }
      } catch (e) {}
    }
    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)
    }
  })

  setContext('api', api)
  setContext('attrs', attrs)
  setContext('refresh', getComments)
  setContext('setMessage', setMessage)
  setContext('addPending', addPending)

  async function getComments(p = 1) {
    loadingComments = true
    try {
      const res = await api.get(`/api/open/comments`, {
        headers: {
          'x-timezone-offset': -new Date().getTimezoneOffset(),
        },
        params: {
          page: p,
          appId: attrs.appId,
          pageId: attrs.pageId,
        },
      })
      commentsResult = res.data.data
      dedupPending()
    } catch (e) {
      error = e
    } finally {
      loadingComments = false
    }
  }

  function onClickPage(p) {
    page = p
    getComments(p)
  }

  onMount(() => {
    loadPending()
    getComments()
  })
</script>

{#if !error}
  <div class="cd-root" class:dark={theme === 'dark'}>
    <section class="cd-card">
      <header class="cd-head">
        <div class="cd-head-text">
          <h2 class="cd-title">{t('comments_heading')}</h2>
          <p class="cd-subtitle">{t('comments_subtitle')}</p>
        </div>
        {#if commentsResult && typeof commentsResult.commentCount === 'number'}
          <span class="cd-count">{commentsResult.commentCount}</span>
        {/if}
      </header>

      {#if message}
        <div class="cd-message">{message}</div>
      {/if}

      <div class="cd-composer-wrap">
        <Reply />
      </div>

      <div class="cd-list">
        {#if loadingComments}
          <div class="cd-loading">{t('loading')}...</div>
        {:else if isEmpty}
          <div class="cd-empty">{t('comments_empty')}</div>
        {:else}
          {#each commentsResult.data as comment (comment.id)}
            <Comment {comment} />
          {/each}

          {#each pendingComments as pending (pending.id)}
            <div class="cd-comment cd-pending">
              <div
                class="cd-avatar"
                style="background:{avatarColor(pending.by_nickname)}"
              >
                {initials(pending.by_nickname)}
              </div>
              <div class="cd-main">
                <div class="cd-meta">
                  <span class="cd-name">{pending.by_nickname}</span>
                  <span class="cd-badge cd-badge-pending"
                    >{t('waiting_for_approval')}</span
                  >
                </div>
                <div class="cd-body" style="white-space: pre-wrap;">
                  {pending.content}
                </div>
              </div>
            </div>
          {/each}

          {#if commentsResult.pageCount > 1}
            <div class="cd-pagination">
              {#each Array(commentsResult.pageCount) as _, index}
                <button
                  class="cd-page"
                  class:cd-page-active={page === index + 1}
                  on:click={(_) => onClickPage(index + 1)}>{index + 1}</button
                >
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <div class="cd-powered">
        <a href="https://cusdis.com">{t('powered_by')}</a>
      </div>
    </section>
  </div>
{/if}
