// English description: Owns the TipTap editor instance, command toolbar state, and content synchronization for blog authoring.

import type { Ref } from "vue"
import StarterKit from "@tiptap/starter-kit"
import { useEditor } from "@tiptap/vue-3"

type CreateBlogEditorTool = {
  key: string
  label: string
  icon: string
  isActive: () => boolean
  run: () => void
}

export function useCreateBlogEditorVM(content: Ref<string>) {
  const { t } = useI18n()
  const editorTick = ref(0)
  const refreshEditorState = () => {
    editorTick.value += 1
  }

  const syncContentFromEditor = () => {
    const instance = editor.value
    if (!instance) return

    content.value = instance.getHTML()
    refreshEditorState()
  }

  const editor = useEditor({
    content: content.value,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "create-blog-page__tiptap-content",
      },
    },
    onCreate: refreshEditorState,
    onSelectionUpdate: refreshEditorState,
    onFocus: refreshEditorState,
    onBlur: refreshEditorState,
    onUpdate: syncContentFromEditor,
  })

  const editorTools = computed<CreateBlogEditorTool[]>(() => {
    void editorTick.value

    return [
      {
        key: "bold",
        label: t("pages.createBlogPage.actionBold"),
        icon: "i-ph-text-b-bold",
        isActive: () => Boolean(editor.value?.isActive("bold")),
        run: () => {
          editor.value?.chain().focus().toggleBold().run()
          refreshEditorState()
        },
      },
      {
        key: "heading",
        label: t("pages.createBlogPage.actionHeading"),
        icon: "i-ph-text-h-bold",
        isActive: () => Boolean(editor.value?.isActive("heading", { level: 2 })),
        run: () => {
          editor.value?.chain().focus().toggleHeading({ level: 2 }).run()
          refreshEditorState()
        },
      },
      {
        key: "quote",
        label: t("pages.createBlogPage.actionQuote"),
        icon: "i-ph-quotes-fill",
        isActive: () => Boolean(editor.value?.isActive("blockquote")),
        run: () => {
          editor.value?.chain().focus().toggleBlockquote().run()
          refreshEditorState()
        },
      },
      {
        key: "bullet-list",
        label: t("pages.createBlogPage.actionList"),
        icon: "i-ph-list-bullets-bold",
        isActive: () => Boolean(editor.value?.isActive("bulletList")),
        run: () => {
          editor.value?.chain().focus().toggleBulletList().run()
          refreshEditorState()
        },
      },
    ]
  })

  const isEditorReady = computed(() => Boolean(editor.value))

  const isEditorEmpty = computed(() => {
    const instance = editor.value
    if (instance) return instance.isEmpty

    const html = content.value.trim()
    return !html || html === "<p></p>"
  })

  watch(content, (value) => {
    const instance = editor.value
    if (!instance || instance.getHTML() === value) return

    instance.commands.setContent(value || "", { emitUpdate: false })
    refreshEditorState()
  })

  return {
    editor,
    editorTools,
    isEditorReady,
    isEditorEmpty,
  }
}
