import { sponsor, site, author, hero } from '@/config.json'
import { motion } from 'framer-motion'
import * as QR from 'qrcode.react'
import { useAtomValue } from 'jotai'
import { metaSlugAtom, metaTitleAtom } from '@/store/metaInfo'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import { useModal } from '@/components/ui/modal'
import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'

interface ShareData {
  url: string
  text: string
}

const shareList = [
  {
    name: 'Twitter',
    icon: 'icon-x',
    onClick: (data: ShareData) => {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}&via=${encodeURIComponent(site.title)}`,
      )
    },
  },
  {
    name: '复制链接',
    icon: 'icon-link',
    onClick: (data: ShareData) => {
      navigator.clipboard.writeText(data.url)
      toast.success('已复制到剪贴板')
    },
  },
]

export function ActionAside() {
  return (
    <div
      className="absolute left-0 bottom-0 flex flex-col gap-4"
      style={{
        transform: 'translateY(calc(100% + 24px))',
      }}
    >
      <ShareButton />
      <DonateButton />
    </div>
  )
}

interface ContextData {
  pre: string
  highlight: string
  post: string
}

function ShareButton() {
  const postSlug = useAtomValue(metaSlugAtom)
  const postTitle = useAtomValue(metaTitleAtom)
  const { present } = useModal()
  const [selectedText, setSelectedText] = useState('')
  const [contextData, setContextData] = useState<ContextData | null>(null)

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
        setSelectedText('')
        setContextData(null)
        return
      }

      const range = selection.getRangeAt(0)
      const selectedStr = selection.toString()
      setSelectedText(selectedStr.trim())

      // Try to find context
      let container = range.commonAncestorContainer
      // If container is text node, get its parent
      const block = container.nodeType === 3 ? container.parentElement : (container as HTMLElement)

      if (block) {
        // Find the nearest block-level element that contains the selection
        let pNode = block
        while (
          pNode &&
          pNode.tagName !== 'P' &&
          pNode.tagName !== 'DIV' &&
          pNode.tagName !== 'LI' &&
          pNode.tagName !== 'BLOCKQUOTE' &&
          pNode !== document.body
        ) {
          pNode = pNode.parentElement as HTMLElement
        }

        if (pNode) {
          // Simple approach: Get full text and try to split by selection
          // Note: This is not perfect if the selection appears multiple times, 
          // but for a simple blog post selection it's usually sufficient.
          const fullText = pNode.textContent || ''
          
          // We use a simpler heuristic: capture X chars before and after the selection
          // based on the range offsets relative to the block.
          // Since mapping range offsets to textContent indices is complex due to nested nodes,
          // we will fallback to just using the textContent and finding the selected string.
          // To make it more robust against duplicates, we could try to use the surrounding text nodes.
          
          // For now, let's try to locate the selected string in the full text.
          // If there are multiple occurrences, we might pick the wrong one, but it's a trade-off for simplicity.
          const idx = fullText.indexOf(selectedStr)
          if (idx !== -1) {
            const preText = fullText.slice(0, idx)
            const postText = fullText.slice(idx + selectedStr.length)
            
            setContextData({
              pre: preText.slice(-60), // Last 60 chars
              highlight: selectedStr,
              post: postText.slice(0, 60), // First 60 chars
            })
            return
          }
        }
      }
      
      // Fallback if we can't find context
      setContextData({
        pre: '',
        highlight: selectedStr,
        post: '',
      })
    }
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  const url = new URL(postSlug, site.url).href
  const defaultText = `嘿，我发现了一片宝藏文章「${postTitle}」哩，快来看看吧！`

  const openModal = () => {
    present({
      content: (
        <ShareModal
          url={url}
          text={selectedText || defaultText}
          isSelection={!!selectedText}
          contextData={contextData}
          postTitle={postTitle}
        />
      ),
    })
  }

  return (
    <button
      type="button"
      aria-label="Share this post"
      className="size-6 text-xl leading-none hover:text-accent"
      onClick={() => openModal()}
    >
      <i className="iconfont icon-share"></i>
    </button>
  )
}

function ShareModal({
  url,
  text,
  isSelection,
  contextData,
  postTitle,
}: {
  url: string
  text: string
  isSelection: boolean
  contextData?: ContextData | null
  postTitle?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const downloadCard = async () => {
    if (!cardRef.current) return
    setGenerating(true)
    try {
      // Wait a bit for fonts and images
      await new Promise((resolve) => setTimeout(resolve, 100))
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#f8f8f8', // Match the card background
        scale: 3, // High Definition
        useCORS: true,
        logging: false,
        allowTaint: true,
      })
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `share-${Date.now()}.png`
      link.click()
    } catch (error) {
      console.error('Failed to generate share card', error)
      toast.error('生成分享卡片失败')
    } finally {
      setGenerating(false)
    }
  }

  if (isSelection) {
    return (
      <motion.div
        className="bg-transparent flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div
          ref={cardRef}
          className="bg-[#f8f8f8] p-8 w-[375px] text-[#333] flex flex-col gap-8 font-serif shadow-2xl relative overflow-hidden"
          style={{
            backgroundImage: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
          }}
        >
          <div className="relative z-10">
            <div className="text-lg leading-relaxed text-justify">
              {contextData ? (
                <>
                  <span className="opacity-40 text-base">{contextData.pre}</span>
                  <span className="font-bold mx-1">{contextData.highlight}</span>
                  <span className="opacity-40 text-base">{contextData.post}</span>
                </>
              ) : (
                text
              )}
            </div>
          </div>

          {/* Decorative quote mark */}
          <div className="absolute top-4 left-4 text-6xl text-black/5 font-serif leading-none select-none pointer-events-none">
            “
          </div>
          
          <div className="mt-auto flex items-end justify-between pt-6 border-t border-black/5">
            <div className="flex items-center gap-3">
              <img 
                src={author.avatar} 
                alt={author.name} 
                className="size-10 rounded-full object-cover border border-white/50"
                crossOrigin="anonymous"
              />
              <div className="flex flex-col max-w-[180px]">
                <span className="font-bold text-sm">{author.name}</span>
                <span className="text-[10px] text-gray-500 leading-tight opacity-80 line-clamp-2">
                  {postTitle || hero.bio}
                </span>
              </div>
            </div>
            <div className="bg-white p-1 rounded-sm shadow-sm">
              <QR.QRCodeSVG value={url} size={55} level="M" />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={downloadCard}
            disabled={generating}
            className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-2"
          >
            {generating ? (
              <i className="iconfont icon-loader animate-spin"></i>
            ) : (
              <i className="iconfont icon-download"></i>
            )}
            保存卡片
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="bg-primary rounded-lg p-2 min-w-[420px] border border-primary flex flex-col"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <h2 className="px-3 py-1 font-bold">分享此内容</h2>
      <hr className="my-2 border-primary" />
      <div className="px-3 py-2 grid grid-cols-[180px_auto] gap-3">
        <QR.QRCodeSVG value={url} size={180} />
        <div className="flex flex-col gap-2">
          <div className="text-sm">分享到...</div>
          <ul className="flex flex-col gap-2">
            {shareList.map((item) => (
              <li
                className="px-2 py-1 flex gap-2 cursor-pointer rounded-md hover:bg-secondary"
                key={item.name}
                onClick={() => item.onClick({ url, text })}
                role="button"
                aria-label={`Share to ${item.name}`}
              >
                <i className={clsx('iconfont text-accent', item.icon)}></i>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

function DonateButton() {
  const { present } = useModal()

  const openDonate = () => {
    present({
      content: <DonateContent />,
    })
  }

  return (
    <button
      type="button"
      aria-label="Donate to author"
      className="size-6 text-xl leading-none hover:text-accent"
      onClick={() => openDonate()}
    >
      <i className="iconfont icon-user-heart"></i>
    </button>
  )
}

function DonateContent() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
    >
      <h2 className="text-center mb-5">感谢您的支持，这将成为我前进的最大动力。</h2>
      <div className="flex flex-wrap gap-4 justify-center">
        <img
          className="object-cover"
          width={300}
          height={300}
          src={sponsor.wechat}
          alt="微信赞赏码"
          loading="lazy"
          decoding="async"
        />
      </div>
    </motion.div>
  )
}
