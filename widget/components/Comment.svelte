<script>
  import { getContext } from 'svelte'
  import { t } from '../i18n'
  import { initials, avatarColor } from '../avatar'

  import Reply from './Reply.svelte'
  export let comment
  export let showReplyForm = false
  export let isChild = false

  $: name =
    comment.moderator && comment.moderator.displayName
      ? comment.moderator.displayName
      : comment.by_nickname
</script>

<div class="cd-comment" class:cd-child={isChild}>
  <div class="cd-avatar" style="background:{avatarColor(name)}">
    {initials(name)}
  </div>

  <div class="cd-main">
    <div class="cd-meta">
      <span class="cd-name">{name}</span>
      {#if comment.moderatorId}
        <span class="cd-badge">{t('mod_badge')}</span>
      {/if}
      <span class="cd-dot">·</span>
      <span class="cd-time">{comment.parsedCreatedAt}</span>
    </div>

    <div class="cd-body">
      {@html comment.parsedContent}
    </div>

    <div class="cd-actions">
      <button
        class="cd-reply-btn"
        type="button"
        on:click={(_) => {
          showReplyForm = !showReplyForm
        }}>{t('reply_btn')}</button
      >
    </div>

    {#if showReplyForm}
      <div class="cd-replyform">
        <Reply
          parentId={comment.id}
          onSuccess={() => {
            showReplyForm = false
          }}
        />
      </div>
    {/if}

    {#if comment.replies.data.length > 0}
      <div class="cd-thread">
        {#each comment.replies.data as child (child.id)}
          <svelte:self isChild={true} comment={child} />
        {/each}
      </div>
    {/if}
  </div>
</div>
