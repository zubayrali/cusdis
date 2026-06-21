<script>
  import { getContext } from 'svelte'
  import { t } from '../i18n'
  export let parentId

  // form data
  let content = ''
  let nickname = ''
  let email = ''

  let loading = false

  export let onSuccess

  const api = getContext('api')
  const setMessage = getContext('setMessage')
  const { appId, pageId, pageUrl, pageTitle } = getContext('attrs')
  const refresh = getContext('refresh')
  const addPending = getContext('addPending')

  async function addComment() {
    if (!content) {
      alert(t('content_is_required'))
      return
    }

    if (!nickname) {
      alert(t('nickname_is_required'))
      return
    }

    try {
      loading = true
      const res = await api.post('/api/open/comments', {
        appId,
        pageId,
        content,
        nickname,
        email,
        parentId,
        pageUrl,
        pageTitle,
      })
      // show the just-posted comment locally as "pending approval";
      // it'll be de-duplicated once approved and returned by the server
      if (addPending && res.data && res.data.data) {
        addPending(res.data.data)
      }
      await refresh()
      teardown()
      setMessage(t('comment_has_been_sent'))
    } finally {
      loading = false
    }
  }

  function teardown() {
    content = ''
    nickname = ''
    email = ''
    onSuccess && onSuccess()
  }
</script>

<div class="cd-composer">
  <textarea
    class="cd-textarea"
    name="reply_content"
    placeholder={t('reply_placeholder')}
    title={t('reply_placeholder')}
    bind:value={content}
  />

  <div class="cd-composer-foot">
    <div class="cd-composer-fields">
      <input
        class="cd-input"
        name="nickname"
        type="text"
        placeholder={t('nickname')}
        title={t('nickname')}
        bind:value={nickname}
      />
      <input
        class="cd-input"
        name="email"
        type="email"
        placeholder={t('email')}
        title={t('email')}
        bind:value={email}
      />
    </div>

    <button
      class="cd-submit"
      class:cd-disabled={loading}
      on:click={addComment}>{loading ? t('sending') : t('post_comment')}</button
    >
  </div>
</div>
