import { Comment, Page, Project } from '@prisma/client'
import { session, signIn } from 'next-auth/client'
import { useRouter } from 'next/router'
import React, { useRef } from 'react'
import { useMutation, useQuery } from 'react-query'
import { ProjectService } from '../../../service/project.service'
import { CommentItem, CommentWrapper } from '../../../service/comment.service'
import { apiClient } from '../../../utils.client'
import dayjs from 'dayjs'
import { useForm } from 'react-hook-form'
import { UserSession } from '../../../service'
import { Head } from '../../../components/Head'
import { getSession, resolvedConfig } from '../../../utils.server'
import { Footer } from '../../../components/Footer'
import { MainLayout } from '../../../components/Layout'
import { AiOutlineCode, AiOutlineUnorderedList, AiOutlineControl, AiOutlineCheck, AiOutlineClose, AiOutlineSmile } from 'react-icons/ai'
import { Card, Avatar, Badge, Stack, Box, Text, Group, Anchor, Button, Pagination, Textarea, Title, Center } from '@mantine/core'
import { MainLayoutData, ViewDataService } from '../../../service/viewData.service'
import { notifications } from '@mantine/notifications'

const AVATAR_COLORS = ['blue', 'cyan', 'grape', 'green', 'indigo', 'orange', 'pink', 'red', 'teal', 'violet']
function initials(name: string) {
  const parts = (name || '?').trim().split(/\s+/)
  const a = parts[0]?.[0] || ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return ((a + b).toUpperCase()) || '?'
}
function avatarColor(name: string) {
  let h = 0
  const s = name || '?'
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

const getComments = async ({ queryKey }) => {
  const [_key, { projectId, page }] = queryKey
  const res = await apiClient.get<{
    data: CommentWrapper,
  }>(`/project/${projectId}/comments`, {
    params: {
      page,
    }
  })
  return res.data.data
}

const approveComment = async ({ commentId }) => {
  const res = await apiClient.post(`/comment/${commentId}/approve`)
  return res.data
}

const deleteComment = async ({ commentId }) => {
  const res = await apiClient.delete(`/comment/${commentId}`)
  return res.data
}

const replyAsModerator = async ({ parentId, content }) => {
  const res = await apiClient.post(`/comment/${parentId}/replyAsModerator`, {
    content
  })
  return res.data.data
}

const deleteProject = async ({ projectId }) => {
  const res = await apiClient.delete<{
    data: string
  }>(`/project/${projectId}`)
  return res.data.data
}

const updateProjectSettings = async ({ projectId, body }) => {
  const res = await apiClient.put(`/project/${projectId}`, body)
  return res.data
}

function CommentToolbar(props: {
  comment: CommentItem,
  refetch: any,
}) {

  const [replyContent, setReplyContent] = React.useState("")
  const [isOpenReplyForm, setIsOpenReplyForm] = React.useState(false)

  const approveCommentMutation = useMutation(approveComment, {
    onSuccess() {
      props.refetch()
    },
    onError(data: any) {
      const {
        error: message,
        status: statusCode
      } = data.response.data

      notifications.show({
        title: "Error",
        message,
        color: 'yellow'
      })
    }
  })
  const replyCommentMutation = useMutation(replyAsModerator, {
    onSuccess() {
      setIsOpenReplyForm(false)
      props.refetch()
    }
  })
  const deleteCommentMutation = useMutation(deleteComment, {
    onSuccess() {
      props.refetch()
    }
  })

  return (
    <Stack>
      <Group spacing={4}>
        {!props.comment.approved && (
          <Button loading={approveCommentMutation.isLoading} onClick={_ => {
            if (window.confirm("Are you sure you want to approve this comment?")) {
              approveCommentMutation.mutate({
                commentId: props.comment.id
              })
            }
          }} leftIcon={<AiOutlineCheck />} color="green" size="xs" variant={'light'}>
            Approve
          </Button>
        )}
        <Button onClick={_ => {
          setIsOpenReplyForm(!isOpenReplyForm)
        }} size="xs" variant={'subtle'}>
          Reply
        </Button>
        <Button loading={deleteCommentMutation.isLoading} onClick={_ => {
          if (window.confirm("Are you sure you want to delete this comment?")) {
            deleteCommentMutation.mutate({
              commentId: props.comment.id
            })
          }
        }} color="red" size="xs" variant={'subtle'}>
          Delete
        </Button>
      </Group>
      {
        isOpenReplyForm &&
        <Stack>
          <Textarea
            autosize
            minRows={2}
            onChange={e => setReplyContent(e.currentTarget.value)}
            placeholder="Reply as moderator"
            sx={{
              // width: 512,
              // maxWidth: '100%'
            }} />
          <Button loading={replyCommentMutation.isLoading} onClick={_ => {
            replyCommentMutation.mutate({
              parentId: props.comment.id,
              content: replyContent
            })
          }} disabled={replyContent.length === 0} size="xs">Reply and approve</Button>
        </Stack>
      }
    </Stack>
  )
}

function ProjectPage(props: {
  project: ProjectServerSideProps,
  session: UserSession,
  mainLayoutData: MainLayoutData
}) {

  React.useEffect(() => {
    if (!props.session) {
      signIn()
    }
  }, [!props.session])

  if (!props.session) {
    return <div>Redirecting to signin..</div>
  }

  const [page, setPage] = React.useState(1)
  const router = useRouter()

  const getCommentsQuery = useQuery(['getComments', { projectId: router.query.projectId as string, page }], getComments, {
  })


  const { commentCount = 0, pageCount = 0 } = getCommentsQuery.data || {}

  return (
    <>
      <MainLayout id="comments" project={props.project} {...props.mainLayoutData}>
        <Stack spacing="lg">
          <div>
            <Title order={2}>Comments</Title>
            <Text size="sm" color="dimmed">
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'} total
            </Text>
          </div>

          <Stack spacing="sm">
            {getCommentsQuery.data?.data.map(comment => {
              return (
                <Card key={comment.id} withBorder radius="md" p="md" sx={{
                  transition: 'box-shadow .15s ease',
                  '&:hover': { boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px -16px rgba(0,0,0,.18)' },
                }}>
                  <Group align="flex-start" spacing="sm" noWrap>
                    <Avatar radius="xl" size={38} color={avatarColor(comment.by_nickname)}>
                      {initials(comment.by_nickname)}
                    </Avatar>
                    <Stack spacing={6} sx={{ flex: 1, minWidth: 0 }}>
                      <Group spacing={8} align="center">
                        <Text weight={600} size="sm">{comment.by_nickname}</Text>
                        {comment.approved
                          ? <Badge size="sm" color="green" variant="light">Approved</Badge>
                          : <Badge size="sm" color="yellow" variant="light">Pending</Badge>}
                      </Group>
                      <Text size="xs" color="dimmed">
                        {comment.parsedCreatedAt} · on{' '}
                        <Anchor href={comment.page.url} target="_blank" color="dimmed" sx={{ textDecoration: 'underline' }}>
                          {comment.page.slug}
                        </Anchor>
                      </Text>
                      <Text size="sm" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {comment.content}
                      </Text>
                      <Box mt={4}>
                        <CommentToolbar comment={comment} refetch={getCommentsQuery.refetch} />
                      </Box>
                    </Stack>
                  </Group>
                </Card>
              )
            })}
          </Stack>

          {getCommentsQuery.data?.data.length === 0 && (
            <Card withBorder radius="md" p="xl">
              <Center>
                <Stack align="center" spacing={4}>
                  <Text weight={600}>No comments yet</Text>
                  <Text color="dimmed" size="sm">Comments will appear here as readers join the conversation.</Text>
                </Stack>
              </Center>
            </Card>
          )}

          {(getCommentsQuery.data?.pageCount || 0) > 1 && (
            <Group position="center">
              <Pagination total={getCommentsQuery.data?.pageCount || 0} value={page} onChange={setPage} />
            </Group>
          )}
        </Stack>
      </MainLayout>
    </>
  )
}

type ProjectServerSideProps = Pick<Project, 'ownerId' | 'id' | 'title' | 'token' | 'enableNotification' | 'webhook' | 'enableWebhook'>

export async function getServerSideProps(ctx) {
  const projectService = new ProjectService(ctx.req)
  const session = await getSession(ctx.req)
  const project = await projectService.get(ctx.query.projectId) as Project
  const viewDataService = new ViewDataService(ctx.req)

  if (!session) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false
      }
    }
  }

  if (project.deletedAt) {
    return {
      redirect: {
        destination: '/404',
        permanent: false
      }
    }
  }

  if (session && (project.ownerId !== session.uid)) {
    return {
      redirect: {
        destination: '/forbidden',
        permanent: false
      }
    }
  }

  const projects = await projectService.list()

  return {
    props: {
      session: await getSession(ctx.req),
      mainLayoutData: await viewDataService.fetchMainLayoutData(),
      project: {
        id: project.id,
        title: project.title,
        ownerId: project.ownerId,
        token: project.token,
        enableNotification: project.enableNotification,
        enableWebhook: project.enableWebhook,
        webhook: project.webhook
      } as ProjectServerSideProps
    }

  }
}

export default ProjectPage
