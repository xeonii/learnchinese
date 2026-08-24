#!/usr/bin/env python3
"""Build src/data/characters.json from the 课标 基本字表 plus high-frequency G1–2 字."""
import json
from pathlib import Path

# char, pinyin, meaning, word, word_pinyin, tier
# tier 1 = 课标 识字写字教学基本字表 (~300)
# tier 2 = high-frequency G1–2 字 a heritage speaker already says
ROWS = """
八|bā|eight|十八|shíbā|1
把|bǎ|handle; ba-construction|把手|bǎshǒu|1
爸|bà|dad|爸爸|bàba|1
白|bái|white|白色|báisè|1
百|bǎi|hundred|一百|yībǎi|1
班|bān|class|上班|shàngbān|1
办|bàn|do; handle|办法|bànfǎ|1
半|bàn|half|一半|yībàn|1
包|bāo|bag; wrap|书包|shūbāo|1
饱|bǎo|full (eaten)|吃饱|chībǎo|1
北|běi|north|北京|Běijīng|1
贝|bèi|shell|贝壳|bèiké|1
被|bèi|passive; quilt|被子|bèizi|1
本|běn|book; this|本子|běnzi|1
比|bǐ|compare|比赛|bǐsài|1
边|biān|side|旁边|pángbiān|1
别|bié|don't; other|别人|biérén|1
不|bù|not|不是|bùshì|1
才|cái|only then|刚才|gāngcái|1
草|cǎo|grass|草地|cǎodì|1
册|cè|volume|一册|yīcè|1
长|cháng|long|很长|hěncháng|1
厂|chǎng|factory|工厂|gōngchǎng|1
吵|chǎo|noisy|吵架|chǎojià|1
车|chē|vehicle|开车|kāichē|1
成|chéng|become|成功|chénggōng|1
吃|chī|eat|吃饭|chīfàn|1
尺|chǐ|ruler|尺子|chǐzi|1
虫|chóng|insect|虫子|chóngzi|1
出|chū|out; exit|出来|chūlái|1
穿|chuān|wear|穿衣服|chuānyīfu|1
船|chuán|boat|上船|shàngchuán|1
窗|chuāng|window|窗户|chuānghu|1
床|chuáng|bed|起床|qǐchuáng|1
春|chūn|spring|春天|chūntiān|1
次|cì|time (occurrence)|一次|yīcì|1
从|cóng|from|从来|cónglái|1
打|dǎ|hit; do|打电话|dǎdiànhuà|1
大|dà|big|大家|dàjiā|1
但|dàn|but|但是|dànshì|1
当|dāng|as; when|当然|dāngrán|1
刀|dāo|knife|刀子|dāozi|1
到|dào|arrive; to|来到|láidào|1
道|dào|way; say|知道|zhīdào|1
的|de|possessive particle|我的|wǒde|1
灯|dēng|lamp|电灯|diàndēng|1
地|dì|ground; earth|土地|tǔdì|1
点|diǎn|o'clock; a bit|一点|yīdiǎn|1
电|diàn|electricity|电话|diànhuà|1
东|dōng|east|东西|dōngxi|1
冬|dōng|winter|冬天|dōngtiān|1
动|dòng|move|运动|yùndòng|1
都|dōu|all|都是|dōushì|1
豆|dòu|bean|豆子|dòuzi|1
对|duì|correct; pair|对不起|duìbuqǐ|1
多|duō|many|多少|duōshǎo|1
儿|ér|child; suffix|儿子|érzi|1
耳|ěr|ear|耳朵|ěrduo|1
二|èr|two|十二|shí'èr|1
发|fā|send; develop|发现|fāxiàn|1
反|fǎn|opposite|相反|xiāngfǎn|1
饭|fàn|rice; meal|吃饭|chīfàn|1
方|fāng|square; side|地方|dìfāng|1
放|fàng|put; release|放学|fàngxué|1
飞|fēi|fly|飞机|fēijī|1
分|fēn|divide; minute|分开|fēnkāi|1
风|fēng|wind|刮风|guāfēng|1
干|gān|dry|干净|gānjìng|1
高|gāo|tall; high|高兴|gāoxìng|1
哥|gē|older brother|哥哥|gēge|1
个|gè|measure word|一个|yīgè|1
给|gěi|give|给你|gěinǐ|1
更|gèng|even more|更好|gènghǎo|1
工|gōng|work|工作|gōngzuò|1
公|gōng|public|公园|gōngyuán|1
共|gòng|together|一共|yīgòng|1
狗|gǒu|dog|小狗|xiǎogǒu|1
瓜|guā|melon|西瓜|xīguā|1
关|guān|close; about|关门|guānmén|1
光|guāng|light|阳光|yángguāng|1
广|guǎng|wide|广东|Guǎngdōng|1
国|guó|country|中国|Zhōngguó|1
果|guǒ|fruit|水果|shuǐguǒ|1
过|guò|pass; too|过去|guòqù|1
孩|hái|child|孩子|háizi|1
海|hǎi|sea|上海|Shànghǎi|1
好|hǎo|good|你好|nǐhǎo|1
合|hé|together|合作|hézuò|1
和|hé|and; with|和平|hépíng|1
河|hé|river|河边|hébiān|1
很|hěn|very|很好|hěnhǎo|1
红|hóng|red|红色|hóngsè|1
后|hòu|after; behind|以后|yǐhòu|1
花|huā|flower|花钱|huāqián|1
画|huà|draw; painting|画画|huàhuà|1
话|huà|speech|说话|shuōhuà|1
还|hái|still; also|还有|háiyǒu|1
回|huí|return|回家|huíjiā|1
会|huì|can; meeting|会说|huìshuō|1
火|huǒ|fire|火车|huǒchē|1
机|jī|machine|手机|shǒujī|1
几|jǐ|how many; a few|几个|jǐgè|1
己|jǐ|self|自己|zìjǐ|1
加|jiā|add|加油|jiāyóu|1
家|jiā|home; family|家里|jiālǐ|1
见|jiàn|see|见面|jiànmiàn|1
江|jiāng|river|江南|Jiāngnán|1
交|jiāo|hand over|交给|jiāogěi|1
叫|jiào|call; be named|叫做|jiàozuò|1
姐|jiě|older sister|姐姐|jiějie|1
巾|jīn|towel|毛巾|máojīn|1
今|jīn|now; today|今天|jīntiān|1
金|jīn|gold; metal|黄金|huángjīn|1
进|jìn|enter|进来|jìnlái|1
京|jīng|capital|北京|Běijīng|1
经|jīng|pass through|经常|jīngcháng|1
九|jiǔ|nine|十九|shíjiǔ|1
就|jiù|then; at once|就是|jiùshì|1
军|jūn|army|军人|jūnrén|1
开|kāi|open; start|开始|kāishǐ|1
看|kàn|look; see|看见|kànjiàn|1
可|kě|can; but|可以|kěyǐ|1
课|kè|lesson|上课|shàngkè|1
口|kǒu|mouth|人口|rénkǒu|1
哭|kū|cry|哭了|kūle|1
快|kuài|fast|快点|kuàidiǎn|1
来|lái|come|过来|guòlái|1
老|lǎo|old|老师|lǎoshī|1
乐|lè|happy|快乐|kuàilè|1
里|lǐ|inside|里面|lǐmiàn|1
力|lì|strength|力气|lìqi|1
立|lì|stand|立刻|lìkè|1
脸|liǎn|face|脸上|liǎnshàng|1
两|liǎng|two|两个|liǎnggè|1
亮|liàng|bright|天亮|tiānliàng|1
了|le|completion particle|吃了|chīle|1
林|lín|forest|树林|shùlín|1
六|liù|six|十六|shíliù|1
妈|mā|mom|妈妈|māma|1
马|mǎ|horse|马上|mǎshàng|1
猫|māo|cat|小猫|xiǎomāo|1
毛|máo|hair; fur|毛巾|máojīn|1
没|méi|not have|没有|méiyǒu|1
每|měi|each|每天|měitiān|1
美|měi|beautiful|美国|Měiguó|1
妹|mèi|younger sister|妹妹|mèimei|1
门|mén|door|门口|ménkǒu|1
们|men|plural marker|我们|wǒmen|1
米|mǐ|rice; meter|米饭|mǐfàn|1
面|miàn|face; noodles|前面|qiánmiàn|1
民|mín|people|人民|rénmín|1
明|míng|bright; tomorrow|明天|míngtiān|1
木|mù|wood; tree|木头|mùtou|1
目|mù|eye|目前|mùqián|1
那|nà|that|那个|nàge|1
奶|nǎi|milk; grandma|奶奶|nǎinai|1
你|nǐ|you|你好|nǐhǎo|1
年|nián|year|今年|jīnnián|1
鸟|niǎo|bird|小鸟|xiǎoniǎo|1
牛|niú|cow|牛奶|niúnǎi|1
农|nóng|farming|农村|nóngcūn|1
女|nǚ|female|女儿|nǚ'ér|1
胖|pàng|fat|胖子|pàngzi|1
跑|pǎo|run|跑步|pǎobù|1
朋|péng|friend|朋友|péngyǒu|1
皮|pí|skin|皮肤|pífū|1
片|piàn|slice|一片|yīpiàn|1
票|piào|ticket|车票|chēpiào|1
平|píng|flat; peace|平时|píngshí|1
七|qī|seven|十七|shíqī|1
奇|qí|strange|奇怪|qíguài|1
起|qǐ|rise; start|起来|qǐlái|1
气|qì|air; anger|天气|tiānqì|1
千|qiān|thousand|一千|yīqiān|1
前|qián|front; before|以前|yǐqián|1
青|qīng|green-blue|青菜|qīngcài|1
秋|qiū|autumn|秋天|qiūtiān|1
去|qù|go|出去|chūqù|1
全|quán|all; whole|全部|quánbù|1
然|rán|so; like that|然后|ránhòu|1
让|ràng|let; make|让我|ràngwǒ|1
人|rén|person|人们|rénmen|1
日|rì|sun; day|生日|shēngrì|1
三|sān|three|十三|shísān|1
山|shān|mountain|山上|shānshàng|1
上|shàng|up; on|上面|shàngmiàn|1
少|shǎo|few|多少|duōshǎo|1
舌|shé|tongue|舌头|shétou|1
身|shēn|body|身体|shēntǐ|1
生|shēng|life; birth|生活|shēnghuó|1
声|shēng|voice; sound|声音|shēngyīn|1
师|shī|teacher|老师|lǎoshī|1
十|shí|ten|十五|shíwǔ|1
什|shén|what|什么|shénme|1
石|shí|stone|石头|shítou|1
时|shí|time|时间|shíjiān|1
市|shì|city; market|市场|shìchǎng|1
是|shì|to be|是的|shìde|1
手|shǒu|hand|洗手|xǐshǒu|1
书|shū|book|看书|kànshū|1
树|shù|tree|大树|dàshù|1
双|shuāng|pair|一双|yīshuāng|1
谁|shuí|who|是谁|shìshuí|1
水|shuǐ|water|喝水|hēshuǐ|1
说|shuō|speak|说话|shuōhuà|1
四|sì|four|十四|shísì|1
岁|suì|years old|几岁|jǐsuì|1
他|tā|he|他们|tāmen|1
她|tā|she|她们|tāmen|1
台|tái|platform|台湾|Táiwān|1
太|tài|too|太多|tàiduō|1
天|tiān|day; sky|天气|tiānqì|1
田|tián|field|田野|tiányě|1
条|tiáo|strip; measure word|一条|yītiáo|1
跳|tiào|jump|跳舞|tiàowǔ|1
听|tīng|listen|听见|tīngjiàn|1
同|tóng|same|同学|tóngxué|1
头|tóu|head|头发|tóufa|1
土|tǔ|earth; soil|土地|tǔdì|1
外|wài|outside|外面|wàimiàn|1
玩|wán|play|好玩|hǎowán|1
晚|wǎn|late; evening|晚上|wǎnshang|1
万|wàn|ten thousand|一万|yīwàn|1
王|wáng|king|王子|wángzǐ|1
网|wǎng|net; web|上网|shàngwǎng|1
为|wèi|for; because of|因为|yīnwèi|1
卫|wèi|guard|卫生|wèishēng|1
文|wén|language; writing|中文|Zhōngwén|1
问|wèn|ask|问题|wèntí|1
我|wǒ|I; me|我们|wǒmen|1
五|wǔ|five|十五|shíwǔ|1
午|wǔ|noon|中午|zhōngwǔ|1
西|xī|west|西瓜|xīguā|1
习|xí|practice|学习|xuéxí|1
洗|xǐ|wash|洗手|xǐshǒu|1
下|xià|down; below|下面|xiàmiàn|1
先|xiān|first|先生|xiānsheng|1
现|xiàn|now; appear|现在|xiànzài|1
向|xiàng|toward|方向|fāngxiàng|1
小|xiǎo|small|小孩|xiǎohái|1
校|xiào|school|学校|xuéxiào|1
笑|xiào|laugh|笑话|xiàohuà|1
些|xiē|some|一些|yīxiē|1
心|xīn|heart|小心|xiǎoxīn|1
兴|xìng|interest; excited|高兴|gāoxìng|1
星|xīng|star|星星|xīngxing|1
行|xíng|OK; walk|不行|bùxíng|1
学|xué|study|学生|xuésheng|1
雪|xuě|snow|下雪|xiàxuě|1
牙|yá|tooth|刷牙|shuāyá|1
羊|yáng|sheep|小羊|xiǎoyáng|1
阳|yáng|sun|太阳|tàiyáng|1
样|yàng|kind; appearance|样子|yàngzi|1
要|yào|want; need|不要|bùyào|1
爷|yé|grandpa|爷爷|yéye|1
也|yě|also|也是|yěshì|1
业|yè|occupation|作业|zuòyè|1
叶|yè|leaf|叶子|yèzi|1
页|yè|page|一页|yīyè|1
一|yī|one|一起|yīqǐ|1
衣|yī|clothes|衣服|yīfu|1
医|yī|medicine; doctor|医生|yīshēng|1
以|yǐ|using; so as to|可以|kěyǐ|1
因|yīn|because|因为|yīnwèi|1
阴|yīn|cloudy; yin|阴天|yīntiān|1
音|yīn|sound|声音|shēngyīn|1
用|yòng|use|不用|bùyòng|1
有|yǒu|have|没有|méiyǒu|1
又|yòu|again|又是|yòushì|1
鱼|yú|fish|钓鱼|diàoyú|1
羽|yǔ|feather|羽毛|yǔmáo|1
雨|yǔ|rain|下雨|xiàyǔ|1
语|yǔ|language|汉语|Hànyǔ|1
元|yuán|yuan; original|一元|yīyuán|1
月|yuè|month; moon|月亮|yuèliang|1
云|yún|cloud|白云|báiyún|1
再|zài|again|再见|zàijiàn|1
在|zài|at; in|现在|xiànzài|1
早|zǎo|early|早上|zǎoshang|1
站|zhàn|stand; station|车站|chēzhàn|1
找|zhǎo|look for|找到|zhǎodào|1
这|zhè|this|这个|zhège|1
真|zhēn|real; really|真的|zhēnde|1
正|zhèng|just; right|正好|zhènghǎo|1
知|zhī|know|知道|zhīdào|1
直|zhí|straight|一直|yīzhí|1
只|zhǐ|only|只有|zhǐyǒu|1
中|zhōng|middle; Chinese|中国|Zhōngguó|1
竹|zhú|bamboo|竹子|zhúzi|1
主|zhǔ|main; host|主要|zhǔyào|1
住|zhù|live|住房|zhùfáng|1
桌|zhuō|table|桌子|zhuōzi|1
着|zhe|aspect particle|看着|kànzhe|1
子|zi|child; suffix|孩子|háizi|1
字|zì|character|汉字|Hànzì|1
自|zì|self|自己|zìjǐ|1
走|zǒu|walk|走路|zǒulù|1
作|zuò|do; work|作业|zuòyè|1
坐|zuò|sit|坐下|zuòxià|1
做|zuò|do; make|做饭|zuòfàn|1
么|me|interrogative particle|什么|shénme|2
吗|ma|yes-no particle|好吗|hǎoma|2
呢|ne|question particle|你呢|nǐne|2
吧|ba|suggestion particle|走吧|zǒuba|2
啊|a|exclamation|是啊|shìa|2
您|nín|you (polite)|您好|nínhǎo|2
谢|xiè|thank|谢谢|xièxie|2
请|qǐng|please; invite|请客|qǐngkè|2
友|yǒu|friend|朋友|péngyǒu|2
南|nán|south|南方|nánfāng|2
左|zuǒ|left|左边|zuǒbiān|2
右|yòu|right|右边|yòubiān|2
买|mǎi|buy|买菜|mǎicài|2
卖|mài|sell|卖出|màichū|2
钱|qián|money|花钱|huāqián|2
错|cuò|wrong|没错|méicuò|2
帮|bāng|help|帮忙|bāngmáng|2
忙|máng|busy|很忙|hěnmáng|2
累|lèi|tired|很累|hěnlèi|2
睡|shuì|sleep|睡觉|shuìjiào|2
觉|jiào|sleep (noun)|睡觉|shuìjiào|2
昨|zuó|yesterday|昨天|zuótiān|2
候|hòu|time; wait|时候|shíhou|2
能|néng|can; able|能够|nénggòu|2
想|xiǎng|think; want|想法|xiǎngfǎ|2
得|dé|get; must|得到|dédào|2
被|bèi|by (passive)|被子|bèizi|2
认|rèn|recognize|认识|rènshi|2
识|shí|know|认识|rènshi|2
汉|hàn|Chinese|汉语|Hànyǔ|2
常|cháng|often|常常|chángcháng|2
最|zuì|most|最好|zuìhǎo|2
刚|gāng|just now|刚才|gāngcái|2
已|yǐ|already|已经|yǐjīng|2
往|wǎng|toward|往来|wǎnglái|2
跟|gēn|with; follow|跟着|gēnzhe|2
或|huò|or|或者|huòzhě|2
如|rú|if; like|如果|rúguǒ|2
所|suǒ|place; that which|所以|suǒyǐ|2
非|fēi|not|非常|fēicháng|2
题|tí|topic; problem|问题|wèntí|2
院|yuàn|courtyard; institute|医院|yīyuàn|2
活|huó|live; work|生活|shēnghuó|2
净|jìng|clean|干净|gānjìng|2
欢|huān|joy|喜欢|xǐhuan|2
喜|xǐ|like; happy|喜欢|xǐhuan|2
爱|ài|love|爱好|àihào|2
冷|lěng|cold|冷水|lěngshuǐ|2
热|rè|hot|热水|rèshuǐ|2
饿|è|hungry|饥饿|jī'è|2
喝|hē|drink|喝水|hēshuǐ|2
唱|chàng|sing|唱歌|chànggē|2
歌|gē|song|唱歌|chànggē|2
舞|wǔ|dance|跳舞|tiàowǔ|2
球|qiú|ball|足球|zúqiú|2
足|zú|foot; enough|足球|zúqiú|2
脑|nǎo|brain|电脑|diànnǎo|2
视|shì|look; vision|电视|diànshì|2
苹|píng|apple (bound)|苹果|píngguǒ|2
色|sè|color|颜色|yánsè|2
黄|huáng|yellow|黄色|huángsè|2
蓝|lán|blue|蓝色|lánsè|2
绿|lǜ|green|绿色|lǜsè|2
黑|hēi|black|黑色|hēisè|2
色|sè|color|颜色|yánsè|2
新|xīn|new|新年|xīnnián|2
旧|jiù|old (used)|旧的|jiùde|2
快|kuài|fast|很快|hěnkuài|2
慢|màn|slow|慢慢|mànmàn|2
远|yuǎn|far|远近|yuǎnjìn|2
近|jìn|near|附近|fùjìn|2
高|gāo|tall|高山|gāoshān|2
低|dī|low|低头|dītóu|2
新|xīn|new|新鲜|xīnxiān|2
路|lù|road|路上|lùshàng|2
街|jiē|street|街上|jiēshàng|2
店|diàn|shop|商店|shāngdiàn|2
房|fáng|house|房子|fángzi|2
屋|wū|room|屋子|wūzi|2
城|chéng|city|城市|chéngshì|2
乡|xiāng|countryside|家乡|jiāxiāng|2
村|cūn|village|农村|nóngcūn|2
路|lù|road|马路|mǎlù|2
车|chē|car|自行车|zìxíngchē|2
块|kuài|piece; yuan|一块|yīkuài|2
元|yuán|yuan|几元|jǐyuán|2
谁|shuí|who|谁的|shuíde|2
哪|nǎ|which|哪里|nǎlǐ|2
怎|zěn|how|怎么|zěnme|2
为|wèi|why; for|为什么|wèishénme|2
所|suǒ|so|所以|suǒyǐ|2
但|dàn|but|但是|dànshì|2
因|yīn|because|因此|yīncǐ|2
所|suǒ|that which|所有|suǒyǒu|2
它|tā|it|它们|tāmen|2
这|zhè|this|这里|zhèlǐ|2
那|nà|that|那里|nàlǐ|2
每|měi|every|每个|měigè|2
次|cì|times|这次|zhècì|2
回|huí|round; time|一回|yīhuí|2
遍|biàn|times (through)|一遍|yībiàn|2
始|shǐ|begin|开始|kāishǐ|2
停|tíng|stop|停车|tíngchē|2
完|wán|finish|完了|wánle|2
忘|wàng|forget|忘记|wàngjì|2
记|jì|remember|记得|jìde|2
答|dá|answer|回答|huídá|2
问|wèn|ask|问好|wènhǎo|2
教|jiāo|teach|教书|jiāoshū|2
读|dú|read|读书|dúshū|2
写|xiě|write|写字|xiězì|2
算|suàn|calculate|算了|suànle|2
数|shù|number|数字|shùzì|2
字|zì|character|名字|míngzi|2
名|míng|name|名字|míngzi|2
姓|xìng|surname|姓名|xìngmíng|2
岁|suì|years old|年岁|niánsuì|2
亲|qīn|relative; kiss|亲爱|qīn'ài|2
哥|gē|brother|大哥|dàgē|2
弟|dì|younger brother|弟弟|dìdi|2
姐|jiě|sister|大姐|dàjiě|2
妹|mèi|sister|小妹|xiǎomèi|2
叔|shū|uncle|叔叔|shūshu|2
伯|bó|uncle|伯伯|bóbo|2
婆|pó|grandma|婆婆|pópo|2
公|gōng|grandpa|外公|wàigōng|2
夫|fū|husband|大夫|dàifu|2
妻|qī|wife|妻子|qīzi|2
孩|hái|child|小孩|xiǎohái|2
客|kè|guest|客人|kèrén|2
友|yǒu|friend|好友|hǎoyǒu|2
帮|bāng|help|帮助|bāngzhù|2
助|zhù|help|帮助|bāngzhù|2
谢|xiè|thanks|感谢|gǎnxiè|2
请|qǐng|please|请进|qǐngjìn|2
坐|zuò|sit|请坐|qǐngzuò|2
开|kāi|open|开心|kāixīn|2
关|guān|close|关系|guānxi|2
系|xì|tie; system|关系|guānxi|2
系|xi|department|中文系|Zhōngwénxì|2
意|yì|meaning|意思|yìsi|2
思|sī|think|意思|yìsi|2
知|zhī|know|知识|zhīshi|2
道|dào|way|道理|dàolǐ|2
理|lǐ|reason; manage|道理|dàolǐ|2
解|jiě|understand|了解|liǎojiě|2
懂|dǒng|understand|听懂|tīngdǒng|2
忘|wàng|forget|忘掉|wàngdiào|2
记|jì|record|日记|rìjì|2
住|zhù|live|记住|jìzhù|2
错|cuò|mistake|错了|cuòle|2
对|duì|right|对了|duìle|2
坏|huài|bad|坏人|huàirén|2
坏|huài|broken|坏了|huàile|2
难|nán|difficult|难过|nánguò|2
易|yì|easy|容易|róngyì|2
容|róng|contain; easy|容易|róngyì|2
简|jiǎn|simple|简单|jiǎndān|2
单|dān|single|简单|jiǎndān|2
复|fù|repeat|复习|fùxí|2
习|xí|practice|练习|liànxí|2
练|liàn|practice|练习|liànxí|2
考|kǎo|test|考试|kǎoshì|2
试|shì|try; test|考试|kǎoshì|2
功|gōng|achievement|功课|gōngkè|2
课|kè|class|课本|kèběn|2
本|běn|notebook|笔记本|bǐjìběn|2
笔|bǐ|pen|铅笔|qiānbǐ|2
纸|zhǐ|paper|纸张|zhǐzhāng|2
包|bāo|bag|背包|bēibāo|2
袋|dài|bag|口袋|kǒudài|2
衣|yī|clothing|大衣|dàyī|2
服|fú|clothes|衣服|yīfu|2
裤|kù|pants|裤子|kùzi|2
鞋|xié|shoes|皮鞋|píxié|2
帽|mào|hat|帽子|màozi|2
饭|fàn|meal|早饭|zǎofàn|2
菜|cài|dish; vegetable|做菜|zuòcài|2
肉|ròu|meat|吃肉|chīròu|2
蛋|dàn|egg|鸡蛋|jīdàn|2
鸡|jī|chicken|鸡肉|jīròu|2
鱼|yú|fish|鱼肉|yúròu|2
奶|nǎi|milk|牛奶|niúnǎi|2
茶|chá|tea|喝茶|hēchá|2
酒|jiǔ|alcohol|喝酒|hējiǔ|2
水|shuǐ|water|开水|kāishuǐ|2
果|guǒ|fruit|果汁|guǒzhī|2
汁|zhī|juice|果汁|guǒzhī|2
糖|táng|sugar; candy|糖果|tángguǒ|2
盐|yán|salt|盐巴|yánbā|2
油|yóu|oil|酱油|jiàngyóu|2
饱|bǎo|full|饱了|bǎole|2
饿|è|hungry|饿了|èle|2
渴|kě|thirsty|口渴|kǒukě|2
困|kùn|sleepy|困了|kùnle|2
病|bìng|sick|生病|shēngbìng|2
痛|tòng|pain|头痛|tóutòng|2
药|yào|medicine|吃药|chīyào|2
医|yī|doctor|医院|yīyuàn|2
院|yuàn|hospital|出院|chūyuàn|2
头|tóu|head|头痛|tóutòng|2
脸|liǎn|face|洗脸|xǐliǎn|2
眼|yǎn|eye|眼睛|yǎnjing|2
睛|jīng|eyeball|眼睛|yǎnjing|2
耳|ěr|ear|耳环|ěrhuán|2
鼻|bí|nose|鼻子|bízi|2
嘴|zuǐ|mouth|嘴巴|zuǐba|2
牙|yá|tooth|牙齿|yáchǐ|2
手|shǒu|hand|手机|shǒujī|2
脚|jiǎo|foot|脚步|jiǎobù|2
腿|tuǐ|leg|大腿|dàtuǐ|2
身|shēn|body|身上|shēnshàng|2
心|xīn|heart|心情|xīnqíng|2
情|qíng|feeling|心情|xīnqíng|2
身|shēn|body|身体|shēntǐ|2
体|tǐ|body|身体|shēntǐ|2
跑|pǎo|run|跑掉|pǎodiào|2
走|zǒu|leave|走了|zǒule|2
来|lái|come|回来|huílái|2
去|qù|go|回去|huíqù|2
回|huí|return|回来|huílái|2
进|jìn|enter|进去|jìnqù|2
出|chū|exit|出去|chūqù|2
上|shàng|up|上去|shàngqù|2
下|xià|down|下来|xiàlái|2
过|guò|cross|过来|guòlái|2
到|dào|arrive|到达|dàodá|2
等|děng|wait|等一下|děngyīxià|2
接|jiē|pick up|接到|jiēdào|2
送|sòng|send; see off|送你|sòngnǐ|2
带|dài|bring|带走|dàizǒu|2
拿|ná|take|拿来|nálái|2
放|fàng|put|放下|fàngxià|2
给|gěi|give|送给|sònggěi|2
用|yòng|use|用来|yònglái|2
找|zhǎo|find|找人|zhǎorén|2
见|jiàn|meet|看见|kànjiàn|2
看|kàn|watch|看电视|kàndiànshì|2
听|tīng|listen|听说|tīngshuō|2
说|shuō|say|说明|shuōmíng|2
讲|jiǎng|speak; explain|讲话|jiǎnghuà|2
问|wèn|ask|提问|tíwèn|2
答|dá|answer|答案|dá'àn|2
笑|xiào|smile|大笑|dàxiào|2
哭|kū|cry|哭声|kūshēng|2
叫|jiào|shout|叫声|jiàoshēng|2
唱|chàng|sing|合唱|héchàng|2
玩|wán|play|玩具|wánjù|2
游|yóu|swim; travel|游泳|yóuyǒng|2
泳|yǒng|swim|游泳|yóuyǒng|2
球|qiú|ball|打球|dǎqiú|2
歌|gē|song|歌曲|gēqǔ|2
画|huà|draw|画家|huàjiā|2
影|yǐng|shadow; film|电影|diànyǐng|2
戏|xì|play; drama|游戏|yóuxì|2
乐|lè|joy|音乐|yīnyuè|2
音|yīn|sound|音乐|yīnyuè|2
乐|yuè|music|音乐|yīnyuè|2
欢|huān|joyous|欢迎|huānyíng|2
迎|yíng|welcome|欢迎|huānyíng|2
祝|zhù|wish|祝福|zhùfú|2
贺|hè|congratulate|祝贺|zhùhè|2
岁|suì|year of age|万岁|wànsuì|2
年|nián|year|过年|guònián|2
节|jié|festival|节日|jiérì|2
日|rì|day|节日|jiérì|2
春|chūn|spring|春节|chūnjié|2
秋|qiū|autumn|中秋|zhōngqiū|2
冬|dōng|winter|冬至|dōngzhì|2
夏|xià|summer|夏天|xiàtiān|2
风|fēng|wind|台风|táifēng|2
雨|yǔ|rain|大雨|dàyǔ|2
雪|xuě|snow|雪人|xuěrén|2
云|yún|cloud|云朵|yúnduǒ|2
天|tiān|sky|天空|tiānkōng|2
空|kōng|empty; sky|空气|kōngqì|2
气|qì|air|空气|kōngqì|2
太|tài|great|太阳|tàiyáng|2
阳|yáng|sun|阳光|yángguāng|2
月|yuè|moon|月光|yuèguāng|2
星|xīng|star|星球|xīngqiú|2
亮|liàng|bright|月亮|yuèliang|2
暗|àn|dark|黑暗|hēi'àn|2
早|zǎo|morning|早餐|zǎocān|2
晚|wǎn|night|晚饭|wǎnfàn|2
午|wǔ|noon|下午|xiàwǔ|2
夜|yè|night|夜里|yèlǐ|2
晨|chén|dawn|早晨|zǎochén|2
间|jiān|interval|时间|shíjiān|2
候|hòu|time|气候|qìhòu|2
刻|kè|quarter hour|立刻|lìkè|2
钟|zhōng|clock|钟头|zhōngtóu|2
点|diǎn|o'clock|三点|sāndiǎn|2
分|fēn|minute|分钟|fēnzhōng|2
秒|miǎo|second|一秒|yīmiǎo|2
半|bàn|half|半天|bàntiān|2
整|zhěng|whole|整齐|zhěngqí|2
现|xiàn|now|发现|fāxiàn|2
在|zài|at|在家|zàijiā|2
刚|gāng|just|刚刚|gānggāng|2
才|cái|just now|才来|cáilái|2
就|jiù|then|就来|jiùlái|2
还|hái|still|还好|háihǎo|2
再|zài|again|再说|zàishuō|2
又|yòu|again|又来|yòulái|2
也|yě|too|也好|yěhǎo|2
都|dōu|both|都来|dōulái|2
全|quán|entire|安全|ānquán|2
安|ān|safe|安全|ānquán|2
全|quán|complete|完全|wánquán|2
完|wán|complete|完全|wánquán|2
已|yǐ|already|已知|yǐzhī|2
经|jīng|already|已经|yǐjīng|2
将|jiāng|will|将来|jiānglái|2
要|yào|going to|要走|yàozǒu|2
会|huì|will|会来|huìlái|2
能|néng|able|能来|nénglái|2
可|kě|may|可能|kěnéng|2
能|néng|possible|可能|kěnéng|2
应|yīng|should|应该|yīnggāi|2
该|gāi|should|应该|yīnggāi|2
必|bì|must|必须|bìxū|2
须|xū|must|必须|bìxū|2
得|děi|must|得走|děizǒu|2
别|bié|don't|别走|biézǒu|2
不|bù|don't|不要|bùyào|2
没|méi|haven't|没来|méilái|2
无|wú|without|无论|wúlùn|2
非|fēi|non-|非常|fēicháng|2
很|hěn|very|很多|hěnduō|2
太|tài|too|太好|tàihǎo|2
真|zhēn|really|真好|zhēnhǎo|2
最|zuì|most|最多|zuìduō|2
更|gèng|more|更多|gèngduō|2
还|hái|even|还多|háiduō|2
再|zài|more|再多|zàiduō|2
比|bǐ|than|比较|bǐjiào|2
较|jiào|compare|比较|bǐjiào|2
最|zuì|-est|最后|zuìhòu|2
先|xiān|first|先后|xiānhòu|2
后|hòu|later|后来|hòulái|2
前|qián|ago|前天|qiántiān|2
昨|zuó|yesterday|昨晚|zuówǎn|2
今|jīn|today|今晚|jīnwǎn|2
明|míng|tomorrow|明年|míngnián|2
后|hòu|day after|后天|hòutiān|2
""".strip().splitlines()


# Intro order: spoken-frequency first so placement isn't 八/把/爸.
FREQ = (
    '的一是不了我人在有他这中大为上个国说们到地你道出就分生会看也'
    '时后能下得里用还去好小多天和心可以年成家种事方如法当起与里'
    '后自面行过学中现发理她所然进给子那都同经什从叫头知因本公'
    '它西电开很见面又力明已正打机太做通她什候再买吃喝走路回'
    '见听说话想爱喜欢谢请吗呢吧谁什么怎么这样现在今天明天'
)


def main():
    seen = {}
    cards = []
    for line in ROWS:
        line = line.strip()
        if not line:
            continue
        char, pinyin, meaning, word, word_pinyin, tier = line.split('|')
        if char in seen:
            continue
        seen[char] = True
        cards.append({
            'char': char,
            'pinyin': pinyin,
            'meaning': meaning,
            'word': word,
            'wordPinyin': word_pinyin,
            'tier': int(tier),
        })
    rank = {ch: i for i, ch in enumerate(FREQ)}
    cards.sort(key=lambda c: (c['tier'], rank.get(c['char'], 10_000), c['char']))

    out = Path('/workspace/src/data/characters.json')
    out.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {len(cards)} cards ({sum(c["tier"]==1 for c in cards)} tier1, {sum(c["tier"]==2 for c in cards)} tier2)')
    dups_in_source = len(ROWS) - len(cards)
    print(f'skipped {dups_in_source} duplicate 字')


if __name__ == '__main__':
    main()
