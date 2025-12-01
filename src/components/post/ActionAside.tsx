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

      // Helper to capture context across DOM nodes
      const getContext = (isPre: boolean, range: Range, maxLength: number = 30) => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement
              if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'BUTTON', 'NAV'].includes(parent.tagName)) {
                return NodeFilter.FILTER_REJECT
              }
              return NodeFilter.FILTER_ACCEPT
            }
          }
        )

        // Initialize walker
        walker.currentNode = isPre ? range.startContainer : range.endContainer
        let text = ''

        // Capture text from the start/end container itself
        if (isPre) {
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            text = range.startContainer.textContent?.substring(0, range.startOffset) || ''
          }
        } else {
          if (range.endContainer.nodeType === Node.TEXT_NODE) {
            text = range.endContainer.textContent?.substring(range.endOffset) || ''
          }
        }

        // Walk to gather more text
        while (text.length < maxLength) {
          const nextNode = isPre ? walker.previousNode() : walker.nextNode()
          if (!nextNode) break
          
          const content = nextNode.textContent || ''
          if (isPre) {
            text = content + text
          } else {
            text = text + content
          }
        }

        return isPre ? text.slice(-maxLength) : text.slice(0, maxLength)
      }

      const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

      setContextData({
        pre: clean(getContext(true, range)),
        highlight: selectedStr, // Keep raw for pre-wrap display
        post: clean(getContext(false, range)),
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
      // Wait a bit for fonts and images to ensure proper rendering
      await new Promise((resolve) => setTimeout(resolve, 600))
      
      // Force fonts to load before capturing
      document.fonts.ready.then(() => {
        console.log('All fonts loaded')
      })
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#f8f8f8', // Match the card background
        scale: 3, // High Definition
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Ensure fonts are loaded in the cloned document
          clonedDoc.fonts.ready.then(() => {
            console.log('Cloned document fonts ready')
          })
        }
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
          className="bg-[#f8f8f8] p-8 w-[375px] text-[#333] flex flex-col gap-0 font-serif shadow-2xl relative overflow-hidden"
          style={{
            backgroundImage: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
          }}
        >
          <div className="relative z-10 pb-8">
             <div className="text-lg leading-relaxed text-justify relative">
               {contextData ? (
                 <>
                   {/* Pre Text - Top Fade */}
                   <div className="text-gray-400 relative">
                     <span>{contextData.pre}</span>
                     <div 
                       className="absolute inset-x-0 -top-2 bottom-0 pointer-events-none"
                       style={{ background: 'linear-gradient(to bottom, rgba(248,248,248,0.9) 0%, rgba(248,248,248,0) 100%)' }}
                     />
                   </div>
                   
                   {/* Highlight Text */}
                   <div className="font-bold text-gray-900 whitespace-pre-wrap my-0">{contextData.highlight}</div>
                   
                   {/* Post Text - Bottom Fade */}
                   <div className="text-gray-400 relative">
                     <span>{contextData.post}</span>
                     <div 
                       className="absolute top-0 -bottom-8 pointer-events-none"
                       style={{ 
                         left: '-32px',
                         right: '-32px',
                         background: 'linear-gradient(to top, rgba(248,248,248,1) 0%, rgba(248,248,248,0) 100%)' 
                       }}
                     />
                   </div>
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
          
          <div className="mt-auto flex items-end justify-between pt-6 border-t border-black/5" style={{ minHeight: '60px' }}>
            <div className="flex items-center gap-3">
              <img 
                src={author.avatar} 
                alt={author.name} 
                className="size-12 rounded-full object-cover border border-white/50"
                crossOrigin="anonymous"
                onLoad={() => console.log('Avatar loaded')}
              />
              <div className="flex flex-col max-w-[180px]" style={{ lineHeight: '1.2' }}>
                <span className="font-bold text-sm text-gray-900 leading-none">{author.name}</span>
                <span className="text-xs text-gray-500 opacity-90 mt-1 leading-none">
                  {postTitle || hero.bio}
                </span>
              </div>
            </div>
            <div className="bg-white p-1 rounded-sm shadow-sm shrink-0 flex items-center justify-center" style={{ height: '42px', width: '42px' }}>
              <QR.QRCodeSVG value={url} size={40} level="M" />
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
